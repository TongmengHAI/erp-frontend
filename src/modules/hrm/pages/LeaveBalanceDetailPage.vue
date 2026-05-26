<script setup lang="ts">
import axios from 'axios';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRouter } from 'vue-router';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import CardSection from '@/shared/components/layout/CardSection.vue';
import LoadingState from '@/shared/components/state/LoadingState.vue';
import ErrorState from '@/shared/components/state/ErrorState.vue';
import DateDisplay from '@/shared/components/data-display/DateDisplay.vue';
import {
    useDeleteLeaveBalance,
    useLeaveBalanceQuery,
} from '@/modules/hrm/composables/useLeaveBalances';
import { formatLeaveRequestDateLabel } from '@/modules/hrm/composables/useLeaveRequestDateLabel';
import {
    balanceSeverity,
    formatRemainingDays,
} from '@/modules/hrm/utils/leaveBalanceDisplay';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type { BalanceLeaveType } from '@/modules/hrm/types/leaveBalance';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';

// ─────────────────────────────────────────────────────────────────────────────
// LeaveBalanceDetailPage — single-balance view with the cross-module
// "Consuming Leave Requests" section.
//
// Two sections:
//
//   1. Balance details — leave_type, period_year, allocated_days,
//      consumed_days, remaining_days (with the LOAD-BEARING
//      over-consumed labeling discipline), notes.
//
//   2. Consuming Leave Requests — the approved LRs that contributed
//      to consumed_days. SINGLE ROUND-TRIP: the show endpoint embeds
//      `consuming_leave_requests` so the section renders without a
//      second fetch. Each row links to the LR detail page — natural
//      cross-module drill-down, same shape as Branch detail's
//      "Employees at this branch" section.
//
// 404 / generic-error split same as the other detail pages.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    id: number;
}
const props = defineProps<Props>();

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const { confirmDelete } = useAppConfirm();

const { data, isLoading, isError, error, refetch } = useLeaveBalanceQuery(
    () => props.id,
);
const deleteMutation = useDeleteLeaveBalance();

const balance = computed(() => data.value?.data ?? null);

const isNotFound = computed<boolean>(() => {
    if (!isError.value) return false;
    const err = error.value;
    if (axios.isAxiosError(err)) return err.response?.status === 404;
    return false;
});
const isGenericError = computed<boolean>(() => isError.value && !isNotFound.value);

const canEdit = computed<boolean>(() => auth.can('hrm.leave_balance.update'));
const canDelete = computed<boolean>(() => auth.can('hrm.leave_balance.delete'));

function typeLabel(type: BalanceLeaveType): string {
    return t(`hrm.leaveBalance.leaveType.${type}`);
}

const breadcrumbs = computed(() => {
    if (!balance.value) {
        return [
            { label: t('hrm.leaveBalance.breadcrumb.list'), to: { name: HRM_ROUTES.LEAVE_BALANCE_LIST } },
        ];
    }
    return [
        { label: t('hrm.leaveBalance.breadcrumb.list'), to: { name: HRM_ROUTES.LEAVE_BALANCE_LIST } },
        {
            label: t('hrm.leaveBalance.breadcrumb.item', {
                employee: balance.value.employee?.full_name ?? `#${balance.value.id}`,
                type: typeLabel(balance.value.leave_type),
                year: balance.value.period_year,
            }),
        },
    ];
});

const pageTitle = computed<string>(() => {
    if (!balance.value) return t('hrm.leaveBalance.breadcrumb.list');
    return t('hrm.leaveBalance.detail.title', {
        employee: balance.value.employee?.full_name ?? `#${balance.value.id}`,
        type: typeLabel(balance.value.leave_type),
        year: balance.value.period_year,
    });
});

// Remaining-display classes — same source-of-truth helper as the list
// page. Over-consumed reads danger, exact-zero reads neutral, healthy
// reads success.
function remainingClasses(remaining: number): string {
    switch (balanceSeverity(remaining)) {
        case 'success':
            return 'text-success-text';
        case 'neutral':
            return 'text-text-secondary';
        case 'danger':
            return 'text-danger-text';
    }
}

function navigateToList(): void {
    void router.push({ name: HRM_ROUTES.LEAVE_BALANCE_LIST });
}
function navigateToEdit(): void {
    if (!balance.value) return;
    void router.push({
        name: HRM_ROUTES.LEAVE_BALANCE_EDIT,
        params: { id: balance.value.id },
    });
}

function onDelete(): void {
    if (!balance.value) return;
    const current = balance.value;
    confirmDelete({
        message: t('hrm.leaveBalance.delete.confirmMessage', {
            employee: current.employee?.full_name ?? `#${current.id}`,
            type: typeLabel(current.leave_type),
            year: current.period_year,
        }),
        acceptLabel: t('hrm.leaveBalance.delete.confirmAction'),
        onAccept: async () => {
            try {
                await deleteMutation.mutateAsync(current.id);
                toast.add({
                    severity: 'success',
                    summary: t('hrm.leaveBalance.delete.toast.success'),
                    life: 3000,
                });
                void router.push({ name: HRM_ROUTES.LEAVE_BALANCE_LIST });
            } catch {
                toast.add({
                    severity: 'error',
                    summary: t('hrm.leaveBalance.delete.toast.error'),
                    life: 4000,
                });
            }
        },
    });
}
</script>

<template>
    <PageLayout width="narrow">
        <template v-if="isLoading">
            <PageHeader
                :title="t('hrm.leaveBalance.breadcrumb.list')"
                :breadcrumbs="[{ label: t('hrm.leaveBalance.breadcrumb.list'), to: { name: HRM_ROUTES.LEAVE_BALANCE_LIST } }]"
            />
            <LoadingState variant="detail" data-testid="leave-balance-detail-loading" />
        </template>

        <template v-else-if="isNotFound">
            <PageHeader
                :title="t('hrm.leaveBalance.notFound.title')"
                :breadcrumbs="[{ label: t('hrm.leaveBalance.breadcrumb.list'), to: { name: HRM_ROUTES.LEAVE_BALANCE_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="leave-balance-detail-not-found"
                >
                    <i class="pi pi-compass text-5xl text-text-tertiary" aria-hidden="true"></i>
                    <h2 class="text-xl font-medium text-text-primary">
                        {{ t('hrm.leaveBalance.notFound.title') }}
                    </h2>
                    <p class="max-w-md text-base text-text-secondary">
                        {{ t('hrm.leaveBalance.notFound.description') }}
                    </p>
                    <Button
                        :label="t('hrm.leaveBalance.notFound.action')"
                        icon="pi pi-arrow-left"
                        severity="secondary"
                        class="mt-2"
                        data-testid="leave-balance-detail-back-to-list"
                        @click="navigateToList"
                    />
                </div>
            </CardSection>
        </template>

        <template v-else-if="isGenericError">
            <PageHeader
                :title="t('hrm.leaveBalance.breadcrumb.list')"
                :breadcrumbs="[{ label: t('hrm.leaveBalance.breadcrumb.list'), to: { name: HRM_ROUTES.LEAVE_BALANCE_LIST } }]"
            />
            <CardSection>
                <ErrorState data-testid="leave-balance-detail-error" @retry="refetch" />
            </CardSection>
        </template>

        <template v-else-if="balance">
            <PageHeader :title="pageTitle" :breadcrumbs="breadcrumbs">
                <template #actions>
                    <Button
                        v-if="canEdit"
                        :label="t('hrm.leaveBalance.detail.edit')"
                        icon="pi pi-pencil"
                        severity="secondary"
                        data-testid="leave-balance-detail-edit-button"
                        @click="navigateToEdit"
                    />
                    <Button
                        v-if="canDelete"
                        :label="t('hrm.leaveBalance.detail.delete')"
                        icon="pi pi-trash"
                        severity="danger"
                        :loading="deleteMutation.isPending.value"
                        data-testid="leave-balance-detail-delete-button"
                        @click="onDelete"
                    />
                </template>
            </PageHeader>

            <CardSection :title="t('hrm.leaveBalance.detail.sections.details')">
                <dl class="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.leaveBalance.detail.fields.employee') }}
                        </dt>
                        <dd
                            class="mt-1 text-base"
                            data-testid="leave-balance-detail-employee"
                        >
                            <RouterLink
                                v-if="balance.employee"
                                :to="{
                                    name: HRM_ROUTES.EMPLOYEE_DETAIL,
                                    params: { id: balance.employee.id },
                                }"
                                class="text-brand hover:underline focus:outline-none focus:underline"
                            >
                                {{ balance.employee.full_name }}
                                <span class="ml-2 text-xs text-text-tertiary tabular-nums">
                                    {{ balance.employee.employee_code }}
                                </span>
                            </RouterLink>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.leaveBalance.detail.noEmployee') }}
                            </span>
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.leaveBalance.detail.fields.type') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="leave-balance-detail-type"
                        >
                            {{ typeLabel(balance.leave_type) }}
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.leaveBalance.detail.fields.periodYear') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary tabular-nums"
                            data-testid="leave-balance-detail-period-year"
                        >
                            {{ balance.period_year }}
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.leaveBalance.detail.fields.allocated') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary tabular-nums"
                            data-testid="leave-balance-detail-allocated"
                        >
                            {{ balance.allocated_days }}
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.leaveBalance.detail.fields.consumed') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary tabular-nums"
                            data-testid="leave-balance-detail-consumed"
                        >
                            {{ balance.consumed_days }}
                        </dd>
                    </div>

                    <!-- LOAD-BEARING: the primary remaining display.
                         Three colour classes mirror the list page's
                         cell — green/neutral/danger map to the three
                         states. The label is always explicit
                         ("Over-consumed by 2 days" for negative; "0
                         days remaining" for exact zero; "11 days
                         remaining" for healthy). NEVER a bare "-2". -->
                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.leaveBalance.detail.fields.remaining') }}
                        </dt>
                        <dd
                            class="mt-1 text-base font-semibold tabular-nums"
                            :class="remainingClasses(balance.remaining_days)"
                            :data-testid="`leave-balance-detail-remaining`"
                            :data-severity="balanceSeverity(balance.remaining_days)"
                        >
                            {{ formatRemainingDays(balance.remaining_days, t) }}
                        </dd>
                    </div>

                    <div class="sm:col-span-2">
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.leaveBalance.detail.fields.notes') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary whitespace-pre-wrap"
                            data-testid="leave-balance-detail-notes"
                        >
                            <span v-if="balance.notes">{{ balance.notes }}</span>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.leaveBalance.detail.noNotes') }}
                            </span>
                        </dd>
                    </div>
                </dl>
            </CardSection>

            <!-- Consuming Leave Requests — embedded by the show
                 endpoint (single round-trip; no separate page-level
                 fetch). Each row links to /hrm/leave-requests/{id};
                 same cross-module drill-down shape as Branch detail's
                 "Employees at this branch" section. Empty state
                 surfaced when consumed_days is 0 (no LRs contributed). -->
            <CardSection
                :title="t('hrm.leaveBalance.detail.sections.consumingRequests')"
                class="mt-4"
            >
                <div
                    v-if="balance.consuming_leave_requests.length === 0"
                    class="py-6 text-center text-sm text-text-tertiary"
                    data-testid="leave-balance-detail-consuming-empty"
                >
                    {{ t('hrm.leaveBalance.detail.consumingEmpty') }}
                </div>
                <ul
                    v-else
                    class="divide-y divide-border-default"
                    data-testid="leave-balance-detail-consuming-list"
                >
                    <li
                        v-for="lr in balance.consuming_leave_requests"
                        :key="lr.id"
                        class="flex items-center justify-between gap-4 py-3"
                    >
                        <div class="min-w-0">
                            <RouterLink
                                :to="{
                                    name: HRM_ROUTES.LEAVE_REQUEST_DETAIL,
                                    params: { id: lr.id },
                                }"
                                class="text-brand hover:underline focus:outline-none focus:underline"
                                :data-testid="`leave-balance-detail-consuming-link-${lr.id}`"
                            >
                                {{ formatLeaveRequestDateLabel({
                                    start_date: lr.start_date,
                                    end_date: lr.end_date,
                                    day_part: lr.day_part,
                                }, t) }}
                            </RouterLink>
                            <div v-if="lr.approved_at" class="text-xs text-text-tertiary mt-0.5">
                                {{ t('hrm.leaveBalance.detail.approvedOn') }}
                                <DateDisplay :date="lr.approved_at" format="short" />
                            </div>
                        </div>
                        <span class="text-sm tabular-nums text-text-primary font-medium shrink-0">
                            {{ t('hrm.leaveBalance.detail.consumingDays', { n: lr.days_count }) }}
                        </span>
                    </li>
                </ul>
            </CardSection>
        </template>
    </PageLayout>
</template>
