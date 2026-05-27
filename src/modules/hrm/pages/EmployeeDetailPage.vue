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
import StatusBadge, {
    type StatusSeverity,
} from '@/shared/components/data-display/StatusBadge.vue';
import DateDisplay from '@/shared/components/data-display/DateDisplay.vue';
import {
    useDeleteEmployee,
    useEmployeeQuery,
} from '@/modules/hrm/composables/useEmployees';
import { useEmployeeLeaveBalancesQuery } from '@/modules/hrm/composables/useEmployeeLeaveBalances';
import EmployeeLeaveBalancesCard from '@/modules/hrm/components/EmployeeLeaveBalancesCard.vue';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type { EmployeeStatus } from '@/modules/hrm/types/employee';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';

// ─────────────────────────────────────────────────────────────────────────────
// EmployeeDetailPage — single-employee view, route param drives the query.
//
// `id` is passed in via the route's `props: (route) => ({ id: Number(... )})`
// declaration in modules/hrm/routes.ts. Direct URL access (typing
// /hrm/employees/42 into the address bar) works the same as navigating
// from the list — the route guard handles auth + the query handles fetch.
//
// 404 path: when the backend returns 404 (id doesn't exist, soft-deleted,
// or in another tenant/company), the query's `isError` flips and we render
// a not-found card with a "back to list" link. Distinguished from generic
// errors (network, 5xx) by inspecting the axios response status.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    /** Resolved from the route via `props: (route) => ({ id: ... })`. */
    id: number;
}
const props = defineProps<Props>();

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const { confirmDelete } = useAppConfirm();

const { data, isLoading, isError, error, refetch } = useEmployeeQuery(
    () => props.id,
);
const deleteMutation = useDeleteEmployee();

const employee = computed(() => data.value?.data ?? null);

// Leave Balances card — current calendar year. The card itself owns
// the empty / loading / error rendering; this page just feeds it the
// employee id, the year, and the query result. The composable's
// `enabled` guard keeps it dormant until employeeId resolves.
//
// Year is computed once on page load. Changing it would mean a year
// picker on the card; not in this slice (current year is the natural
// "how many days does this employee have left right now?" question
// the page is here to answer).
const currentYear = new Date().getFullYear();
const leaveBalancesQuery = useEmployeeLeaveBalancesQuery(
    () => props.id,
    () => currentYear,
);

/**
 * 404 vs generic-error split. Axios attaches the response to the thrown
 * error; a 404 means the id doesn't exist (or the row is hidden by the
 * tenant/company scope on the backend — either way, "not here").
 * Anything else (network, 5xx, 401 caught by other layers) is a generic
 * retry-able error.
 */
const isNotFound = computed<boolean>(() => {
    if (!isError.value) return false;
    const err = error.value;
    if (axios.isAxiosError(err)) {
        return err.response?.status === 404;
    }
    return false;
});

const isGenericError = computed<boolean>(() => isError.value && !isNotFound.value);

const canEdit = computed<boolean>(() => auth.can('hrm.employee.update'));
const canDelete = computed<boolean>(() => auth.can('hrm.employee.delete'));

function statusSeverity(status: EmployeeStatus): StatusSeverity {
    switch (status) {
        case 'active':
            return 'success';
        case 'on_leave':
            return 'warning';
        case 'terminated':
            return 'neutral';
    }
}

function statusLabel(status: EmployeeStatus): string {
    return t(`hrm.employee.status.${status}`);
}

const breadcrumbs = computed(() => [
    { label: t('hrm.employee.breadcrumb.list'), to: { name: HRM_ROUTES.EMPLOYEE_LIST } },
    {
        label: employee.value?.full_name ?? t('hrm.employee.breadcrumb.list'),
    },
]);

function navigateToList(): void {
    void router.push({ name: HRM_ROUTES.EMPLOYEE_LIST });
}

function navigateToEdit(): void {
    if (!employee.value) return;
    void router.push({
        name: HRM_ROUTES.EMPLOYEE_EDIT,
        params: { id: employee.value.id },
    });
}

/**
 * Delete flow: confirm → mutate → toast → route back to list.
 * Mutation errors surface as a danger toast and leave the user on the
 * detail page. The composable invalidates the employee queryKey on
 * success so the list re-fetches automatically.
 */
function onDelete(): void {
    if (!employee.value) return;
    const current = employee.value;
    confirmDelete({
        message: t('hrm.employee.delete.confirmMessage', { name: current.full_name }),
        acceptLabel: t('hrm.employee.delete.confirmAction'),
        onAccept: async () => {
            try {
                await deleteMutation.mutateAsync(current.id);
                toast.add({
                    severity: 'success',
                    summary: t('hrm.employee.delete.toast.success'),
                    life: 3000,
                });
                void router.push({ name: HRM_ROUTES.EMPLOYEE_LIST });
            } catch {
                toast.add({
                    severity: 'error',
                    summary: t('hrm.employee.delete.toast.error'),
                    life: 4000,
                });
            }
        },
    });
}
</script>

<template>
    <PageLayout width="narrow">
        <!-- Loading: render skeleton chrome AND the page header in a
             holding state. The header doesn't have the employee name yet
             so we show a placeholder title. -->
        <template v-if="isLoading">
            <PageHeader
                :title="t('hrm.employee.breadcrumb.list')"
                :breadcrumbs="[{ label: t('hrm.employee.breadcrumb.list'), to: { name: HRM_ROUTES.EMPLOYEE_LIST } }]"
            />
            <LoadingState variant="detail" data-testid="employee-detail-loading" />
        </template>

        <!-- Not found: stand-alone card, no chrome actions. Distinguished
             from generic error so a stale URL doesn't show a retry button
             that would just re-issue the same 404. -->
        <template v-else-if="isNotFound">
            <PageHeader
                :title="t('hrm.employee.notFound.title')"
                :breadcrumbs="[{ label: t('hrm.employee.breadcrumb.list'), to: { name: HRM_ROUTES.EMPLOYEE_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="employee-detail-not-found"
                >
                    <i class="pi pi-compass text-5xl text-text-tertiary" aria-hidden="true"></i>
                    <h2 class="text-xl font-medium text-text-primary">
                        {{ t('hrm.employee.notFound.title') }}
                    </h2>
                    <p class="max-w-md text-base text-text-secondary">
                        {{ t('hrm.employee.notFound.description') }}
                    </p>
                    <Button
                        :label="t('hrm.employee.notFound.action')"
                        icon="pi pi-arrow-left"
                        severity="secondary"
                        class="mt-2"
                        data-testid="employee-detail-back-to-list"
                        @click="navigateToList"
                    />
                </div>
            </CardSection>
        </template>

        <!-- Generic error: retry-able. Stays within the page chrome so the
             user retains navigation context. -->
        <template v-else-if="isGenericError">
            <PageHeader
                :title="t('hrm.employee.breadcrumb.list')"
                :breadcrumbs="[{ label: t('hrm.employee.breadcrumb.list'), to: { name: HRM_ROUTES.EMPLOYEE_LIST } }]"
            />
            <CardSection>
                <ErrorState data-testid="employee-detail-error" @retry="refetch" />
            </CardSection>
        </template>

        <!-- Populated: header + details card. -->
        <template v-else-if="employee">
            <PageHeader :title="employee.full_name" :breadcrumbs="breadcrumbs">
                <template #actions>
                    <Button
                        v-if="canEdit"
                        :label="t('hrm.employee.detail.edit')"
                        icon="pi pi-pencil"
                        severity="secondary"
                        data-testid="employee-detail-edit-button"
                        @click="navigateToEdit"
                    />
                    <Button
                        v-if="canDelete"
                        :label="t('hrm.employee.detail.delete')"
                        icon="pi pi-trash"
                        severity="danger"
                        :loading="deleteMutation.isPending.value"
                        data-testid="employee-detail-delete-button"
                        @click="onDelete"
                    />
                </template>
            </PageHeader>

            <CardSection :title="t('hrm.employee.detail.sections.details')">
                <dl class="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.employee.detail.fields.code') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary tabular-nums"
                            data-testid="employee-detail-code"
                        >
                            {{ employee.employee_code }}
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.employee.detail.fields.fullName') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="employee-detail-name"
                        >
                            {{ employee.full_name }}
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.employee.detail.fields.email') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="employee-detail-email"
                        >
                            <a
                                v-if="employee.email"
                                :href="`mailto:${employee.email}`"
                                class="text-brand hover:underline"
                            >{{ employee.email }}</a>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.employee.detail.noEmail') }}
                            </span>
                        </dd>
                    </div>

                    <!-- Cross-module row order: Department → Branch →
                         Position. Matches the column order on the list
                         and the picker order on the form — one
                         consistent reading order across all three
                         Employee surfaces. Each row uses the same shape:
                         RouterLink to the related detail page when set,
                         "—" placeholder when null (covers both
                         unassigned AND the soft-deleted-parent case —
                         backend returns the snapshot as null in both). -->
                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.employee.detail.fields.department') }}
                        </dt>
                        <dd
                            class="mt-1 text-base"
                            data-testid="employee-detail-department"
                        >
                            <RouterLink
                                v-if="employee.department"
                                :to="{
                                    name: HRM_ROUTES.DEPARTMENT_DETAIL,
                                    params: { id: employee.department.id },
                                }"
                                class="text-brand hover:underline focus:outline-none focus:underline"
                                :data-testid="`employee-detail-department-link-${employee.department.id}`"
                            >
                                {{ employee.department.name }}
                            </RouterLink>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.employee.detail.noDepartment') }}
                            </span>
                        </dd>
                    </div>

                    <!-- Branch — deliberately wider snapshot than
                         Department / Position rows. Branch name links
                         to BranchDetailPage; city + country_code render
                         as a muted secondary line beneath, separated by
                         a middot. Both location fields are nullable on
                         the backend so we render whichever is present.
                         Location-being-the-differentiator is what
                         justifies the wider snapshot — two "HQ" branches
                         in different cities are distinguishable at a
                         glance here. -->
                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.employee.detail.fields.branch') }}
                        </dt>
                        <dd
                            class="mt-1 text-base"
                            data-testid="employee-detail-branch"
                        >
                            <template v-if="employee.branch">
                                <RouterLink
                                    :to="{
                                        name: HRM_ROUTES.BRANCH_DETAIL,
                                        params: { id: employee.branch.id },
                                    }"
                                    class="text-brand hover:underline focus:outline-none focus:underline"
                                    :data-testid="`employee-detail-branch-link-${employee.branch.id}`"
                                >
                                    {{ employee.branch.name }}
                                </RouterLink>
                                <div
                                    v-if="employee.branch.city || employee.branch.country_code"
                                    class="mt-0.5 text-sm text-text-tertiary"
                                    data-testid="employee-detail-branch-location"
                                >
                                    <span v-if="employee.branch.city">{{ employee.branch.city }}</span>
                                    <span
                                        v-if="employee.branch.city && employee.branch.country_code"
                                    >{{ t('hrm.employee.detail.branchLocationSeparator') }}</span>
                                    <span
                                        v-if="employee.branch.country_code"
                                        class="tabular-nums"
                                    >{{ employee.branch.country_code }}</span>
                                </div>
                            </template>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.employee.detail.noBranch') }}
                            </span>
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.employee.detail.fields.position') }}
                        </dt>
                        <dd
                            class="mt-1 text-base"
                            data-testid="employee-detail-position"
                        >
                            <RouterLink
                                v-if="employee.position"
                                :to="{
                                    name: HRM_ROUTES.POSITION_DETAIL,
                                    params: { id: employee.position.id },
                                }"
                                class="text-brand hover:underline focus:outline-none focus:underline"
                                :data-testid="`employee-detail-position-link-${employee.position.id}`"
                            >
                                {{ employee.position.title }}
                            </RouterLink>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.employee.detail.noPosition') }}
                            </span>
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.employee.detail.fields.hireDate') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="employee-detail-hire-date"
                        >
                            <DateDisplay :date="employee.hire_date" format="long" />
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.employee.detail.fields.status') }}
                        </dt>
                        <dd class="mt-1" data-testid="employee-detail-status">
                            <StatusBadge
                                :severity="statusSeverity(employee.status)"
                                :label="statusLabel(employee.status)"
                            />
                        </dd>
                    </div>
                </dl>
            </CardSection>

            <!-- Leave Balances card — the closing slice of HRM v1.
                 Lands after the Status row in the Details card and
                 before the (future) audit-timestamps section. Shows
                 the employee's current-year allocations + remaining
                 days using the same balanceSeverity + formatRemaining
                 Days helpers the LB list / detail pages use — so a
                 -2 here renders identically to a -2 there. The
                 "Manage balances" footer link pre-filters the LB
                 list to this employee. -->
            <EmployeeLeaveBalancesCard
                class="mt-4"
                :employee-id="employee.id"
                :period-year="currentYear"
                :query="leaveBalancesQuery"
            />
        </template>
    </PageLayout>
</template>
