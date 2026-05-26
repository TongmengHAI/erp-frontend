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
    useAttendanceDetailQuery,
    useDeleteAttendance,
} from '@/modules/hrm/composables/useAttendance';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type { AttendanceStatus } from '@/modules/hrm/types/attendance';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';

// ─────────────────────────────────────────────────────────────────────────────
// AttendanceDetailPage — single-record view. Standard shape, no state-
// machine complexity (Attendance is pure CRUD; the state machine lives
// on Leave Requests).
//
// 404 path: route-model binding returns 404 for cross-tenant /
// cross-company / soft-deleted ids. Distinguished from generic 5xx by
// inspecting axios response status.
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

const { data, isLoading, isError, error, refetch } = useAttendanceDetailQuery(
    () => props.id,
);
const deleteMutation = useDeleteAttendance();

const record = computed(() => data.value?.data ?? null);

const isNotFound = computed<boolean>(() => {
    if (!isError.value) return false;
    const err = error.value;
    if (axios.isAxiosError(err)) return err.response?.status === 404;
    return false;
});
const isGenericError = computed<boolean>(() => isError.value && !isNotFound.value);

const canEdit = computed<boolean>(() => auth.can('hrm.attendance.update'));
const canDelete = computed<boolean>(() => auth.can('hrm.attendance.delete'));

function statusSeverity(status: AttendanceStatus): StatusSeverity {
    switch (status) {
        case 'present':
            return 'success';
        case 'absent':
            return 'danger';
        case 'late':
            return 'warning';
        case 'on_leave':
            return 'info';
        case 'half_day':
            return 'warning';
    }
}
function statusLabel(status: AttendanceStatus): string {
    return t(`hrm.attendance.status.${status}`);
}

const pageTitle = computed<string>(() => {
    const r = record.value;
    if (!r) return t('hrm.attendance.breadcrumb.list');
    const employeeName = r.employee?.full_name ?? t('hrm.attendance.detail.noEmployee');
    return `${employeeName} — ${r.date}`;
});

const breadcrumbs = computed(() => [
    {
        label: t('hrm.attendance.breadcrumb.list'),
        to: { name: HRM_ROUTES.ATTENDANCE_LIST },
    },
    {
        label: record.value?.employee?.full_name ?? t('hrm.attendance.breadcrumb.list'),
    },
]);

function navigateToList(): void {
    void router.push({ name: HRM_ROUTES.ATTENDANCE_LIST });
}
function navigateToEdit(): void {
    if (!record.value) return;
    void router.push({
        name: HRM_ROUTES.ATTENDANCE_EDIT,
        params: { id: record.value.id },
    });
}

function onDelete(): void {
    if (!record.value) return;
    confirmDelete({
        message: t('hrm.attendance.delete.confirmMessage'),
        acceptLabel: t('hrm.attendance.delete.confirmAction'),
        onAccept: async () => {
            try {
                await deleteMutation.mutateAsync(record.value!.id);
                toast.add({
                    severity: 'success',
                    summary: t('hrm.attendance.delete.toast.success'),
                    life: 3000,
                });
                void router.push({ name: HRM_ROUTES.ATTENDANCE_LIST });
            } catch {
                toast.add({
                    severity: 'error',
                    summary: t('hrm.attendance.delete.toast.error'),
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
                :title="t('hrm.attendance.breadcrumb.list')"
                :breadcrumbs="[{ label: t('hrm.attendance.breadcrumb.list'), to: { name: HRM_ROUTES.ATTENDANCE_LIST } }]"
            />
            <LoadingState variant="detail" data-testid="attendance-detail-loading" />
        </template>

        <template v-else-if="isNotFound">
            <PageHeader
                :title="t('hrm.attendance.notFound.title')"
                :breadcrumbs="[{ label: t('hrm.attendance.breadcrumb.list'), to: { name: HRM_ROUTES.ATTENDANCE_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="attendance-detail-not-found"
                >
                    <i class="pi pi-compass text-5xl text-text-tertiary" aria-hidden="true"></i>
                    <h2 class="text-xl font-medium text-text-primary">
                        {{ t('hrm.attendance.notFound.title') }}
                    </h2>
                    <p class="max-w-md text-base text-text-secondary">
                        {{ t('hrm.attendance.notFound.description') }}
                    </p>
                    <Button
                        :label="t('hrm.attendance.notFound.action')"
                        icon="pi pi-arrow-left"
                        severity="secondary"
                        class="mt-2"
                        data-testid="attendance-detail-back-to-list"
                        @click="navigateToList"
                    />
                </div>
            </CardSection>
        </template>

        <template v-else-if="isGenericError">
            <PageHeader
                :title="t('hrm.attendance.breadcrumb.list')"
                :breadcrumbs="[{ label: t('hrm.attendance.breadcrumb.list'), to: { name: HRM_ROUTES.ATTENDANCE_LIST } }]"
            />
            <CardSection>
                <ErrorState data-testid="attendance-detail-error" @retry="refetch" />
            </CardSection>
        </template>

        <template v-else-if="record">
            <PageHeader :title="pageTitle" :breadcrumbs="breadcrumbs">
                <template #actions>
                    <Button
                        v-if="canEdit"
                        :label="t('hrm.attendance.detail.edit')"
                        icon="pi pi-pencil"
                        severity="secondary"
                        data-testid="attendance-detail-edit-button"
                        @click="navigateToEdit"
                    />
                    <Button
                        v-if="canDelete"
                        :label="t('hrm.attendance.detail.delete')"
                        icon="pi pi-trash"
                        severity="danger"
                        :loading="deleteMutation.isPending.value"
                        data-testid="attendance-detail-delete-button"
                        @click="onDelete"
                    />
                </template>
            </PageHeader>

            <CardSection :title="t('hrm.attendance.detail.sections.details')">
                <dl class="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.attendance.detail.fields.employee') }}
                        </dt>
                        <dd
                            class="mt-1 text-base"
                            data-testid="attendance-detail-employee"
                        >
                            <RouterLink
                                v-if="record.employee"
                                :to="{
                                    name: HRM_ROUTES.EMPLOYEE_DETAIL,
                                    params: { id: record.employee.id },
                                }"
                                class="text-brand hover:underline focus:outline-none focus:underline"
                                :data-testid="`attendance-detail-employee-link-${record.employee.id}`"
                            >
                                {{ record.employee.full_name }}
                                <span class="ml-2 text-xs text-text-tertiary tabular-nums">
                                    {{ record.employee.employee_code }}
                                </span>
                            </RouterLink>
                            <span v-else class="text-text-tertiary italic">
                                {{ t('hrm.attendance.detail.noEmployee') }}
                            </span>
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.attendance.detail.fields.date') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="attendance-detail-date"
                        >
                            <DateDisplay :date="record.date" format="long" />
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.attendance.detail.fields.clockIn') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary tabular-nums"
                            data-testid="attendance-detail-clock-in"
                        >
                            <span v-if="record.clock_in">{{ record.clock_in }}</span>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.attendance.detail.noClockTime') }}
                            </span>
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.attendance.detail.fields.clockOut') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary tabular-nums"
                            data-testid="attendance-detail-clock-out"
                        >
                            <span v-if="record.clock_out">{{ record.clock_out }}</span>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.attendance.detail.noClockTime') }}
                            </span>
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.attendance.detail.fields.status') }}
                        </dt>
                        <dd class="mt-1" data-testid="attendance-detail-status">
                            <StatusBadge
                                :severity="statusSeverity(record.status)"
                                :label="statusLabel(record.status)"
                            />
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.attendance.detail.fields.createdAt') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="attendance-detail-created-at"
                        >
                            <DateDisplay :date="record.created_at" format="short" />
                        </dd>
                    </div>

                    <div class="sm:col-span-2">
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.attendance.detail.fields.notes') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary whitespace-pre-wrap"
                            data-testid="attendance-detail-notes"
                        >
                            <span v-if="record.notes">{{ record.notes }}</span>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.attendance.detail.noNotes') }}
                            </span>
                        </dd>
                    </div>
                </dl>
            </CardSection>
        </template>
    </PageLayout>
</template>
