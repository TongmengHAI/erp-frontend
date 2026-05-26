<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import { useToast } from 'primevue/usetoast';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import FilterBar from '@/shared/components/layout/FilterBar.vue';
import EmptyState from '@/shared/components/state/EmptyState.vue';
import DataTable from '@/shared/components/data-table/DataTable.vue';
import StatusBadge, {
    type StatusSeverity,
} from '@/shared/components/data-display/StatusBadge.vue';
import DateDisplay from '@/shared/components/data-display/DateDisplay.vue';
import type {
    DataTableColumn,
    RowAction,
} from '@/shared/components/data-table/types';
import {
    useAttendanceQuery,
    useDeleteAttendance,
} from '@/modules/hrm/composables/useAttendance';
import { useEmployeesQuery } from '@/modules/hrm/composables/useEmployees';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type {
    AttendanceListParams,
    AttendanceRecordBrief,
    AttendanceStatus,
} from '@/modules/hrm/types/attendance';
import { ATTENDANCE_STATUSES } from '@/modules/hrm/types/attendance';
import {
    dateToYYYYMMDD,
    stringToDate,
} from '@/modules/hrm/utils/dateConversion';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';

// ─────────────────────────────────────────────────────────────────────────────
// AttendanceListPage — paginated list of attendance records.
//
// Default sort: date DESC (newest first) — manager's "what happened
// recently" view. The backend enforces this; the list page surfaces
// it without an explicit sort param.
//
// Four filters: employee, status, from, to. All optional. Employee
// picker reuses useEmployeesQuery({ status: 'active', per_page: 100 })
// — same shape as the Leave Request form's employee picker. Beyond
// 100 active employees the picker silently shows only the first 100,
// which is the data-driven trigger noted in the Leave Requests slice
// for revisiting (typeahead vs paginated picker).
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const { confirmDelete } = useAppConfirm();
const deleteMutation = useDeleteAttendance();

// ─── Filter state ───────────────────────────────────────────────────────────
const employeeFilter = ref<number | null>(null);
const statusFilter = ref<AttendanceStatus | null>(null);
const fromFilter = ref<string>('');
const toFilter = ref<string>('');
const page = ref(1);
const perPage = ref(25);

function resetPage(): void {
    page.value = 1;
}

// ─── Filter options ─────────────────────────────────────────────────────────
interface StatusOption {
    value: AttendanceStatus | null;
    label: string;
}
const statusOptions = computed<StatusOption[]>(() => [
    { value: null, label: t('hrm.attendance.list.filters.anyStatus') },
    ...ATTENDANCE_STATUSES.map((s) => ({
        value: s,
        label: t(`hrm.attendance.status.${s}`),
    })),
]);

// Employee picker for the filter bar. Same per_page: 100 cap as the
// form's picker; data-driven trigger to revisit when active-employee
// count exceeds it.
const employeesQuery = useEmployeesQuery(() => ({
    status: 'active' as const,
    per_page: 100,
}));

interface EmployeeOption {
    value: number | null;
    label: string;
}
const employeeOptions = computed<EmployeeOption[]>(() => [
    { value: null, label: t('hrm.attendance.list.filters.anyStatus') }, // "Any" reuse
    ...(employeesQuery.data.value?.data ?? []).map((e) => ({
        value: e.id,
        label: `${e.full_name}${e.employee_code ? ` (${e.employee_code})` : ''}`,
    })),
]);

// ─── Query params (reactive) ───────────────────────────────────────────────
const queryParams = computed<AttendanceListParams>(() => {
    const params: AttendanceListParams = { page: page.value, per_page: perPage.value };
    if (employeeFilter.value !== null) params.employee_id = employeeFilter.value;
    if (statusFilter.value !== null) params.status = statusFilter.value;
    if (fromFilter.value) params.from = fromFilter.value;
    if (toFilter.value) params.to = toFilter.value;
    return params;
});

const { data, isLoading, isError, refetch } = useAttendanceQuery(queryParams);

// ─── Status badge severity mapping ──────────────────────────────────────────
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

// ─── DataTable column config ────────────────────────────────────────────────
const columns = computed<DataTableColumn<AttendanceRecordBrief>[]>(() => [
    { field: 'employee_name', label: 'hrm.attendance.list.columns.employee', type: 'custom' },
    { field: 'date', label: 'hrm.attendance.list.columns.date', type: 'custom', width: '160px' },
    { field: 'clock_in', label: 'hrm.attendance.list.columns.clockIn', type: 'custom', align: 'center', width: '120px' },
    { field: 'clock_out', label: 'hrm.attendance.list.columns.clockOut', type: 'custom', align: 'center', width: '120px' },
    { field: 'status', label: 'hrm.attendance.list.columns.status', type: 'custom', align: 'center', width: '140px' },
]);

// ─── Permission-gated row actions ───────────────────────────────────────────
const canEdit = computed<boolean>(() => auth.can('hrm.attendance.update'));
const canDelete = computed<boolean>(() => auth.can('hrm.attendance.delete'));

const rowActions = computed<RowAction<AttendanceRecordBrief>[]>(() => {
    const actions: RowAction<AttendanceRecordBrief>[] = [
        {
            key: 'view',
            label: 'hrm.attendance.list.actions.view',
            icon: 'pi pi-eye',
            onClick: (row) => navigateToDetail(row.id),
        },
    ];
    if (canEdit.value) {
        actions.push({
            key: 'edit',
            label: 'hrm.attendance.list.actions.edit',
            icon: 'pi pi-pencil',
            onClick: (row) => navigateToEdit(row.id),
        });
    }
    if (canDelete.value) {
        actions.push({
            key: 'delete',
            label: 'hrm.attendance.list.actions.delete',
            icon: 'pi pi-trash',
            severity: 'danger',
            onClick: (row) => onDelete(row),
        });
    }
    return actions;
});

function navigateToDetail(id: number): void {
    void router.push({ name: HRM_ROUTES.ATTENDANCE_DETAIL, params: { id } });
}
function navigateToNew(): void {
    void router.push({ name: HRM_ROUTES.ATTENDANCE_NEW });
}
function navigateToEdit(id: number): void {
    void router.push({ name: HRM_ROUTES.ATTENDANCE_EDIT, params: { id } });
}

function onDelete(row: AttendanceRecordBrief): void {
    confirmDelete({
        message: t('hrm.attendance.delete.confirmMessage'),
        acceptLabel: t('hrm.attendance.delete.confirmAction'),
        onAccept: async () => {
            try {
                await deleteMutation.mutateAsync(row.id);
                toast.add({
                    severity: 'success',
                    summary: t('hrm.attendance.delete.toast.success'),
                    life: 3000,
                });
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

const rows = computed<AttendanceRecordBrief[]>(() => data.value?.data ?? []);
const total = computed<number>(() => data.value?.meta.total ?? 0);
const hasFilters = computed<boolean>(
    () =>
        employeeFilter.value !== null ||
        statusFilter.value !== null ||
        fromFilter.value !== '' ||
        toFilter.value !== '',
);
const canCreate = computed<boolean>(() => auth.can('hrm.attendance.create'));

const errorMessage = computed<string | null>(() => (isError.value ? '' : null));

const showWelcomeEmpty = computed<boolean>(
    () => !isLoading.value && !isError.value && total.value === 0 && !hasFilters.value,
);

const tableEmptyOverride = computed(() => ({
    icon: 'pi pi-search',
    title: t('hrm.attendance.list.filteredEmpty.title'),
    description: t('hrm.attendance.list.filteredEmpty.description'),
}));
</script>

<template>
    <PageLayout>
        <PageHeader
            :title="t('hrm.attendance.list.title')"
            :subtitle="t('hrm.attendance.list.subtitle')"
        >
            <template #actions>
                <Button
                    v-if="canCreate"
                    :label="t('hrm.attendance.list.newAction')"
                    icon="pi pi-plus"
                    data-testid="attendance-list-new-button"
                    @click="navigateToNew"
                />
            </template>
        </PageHeader>

        <FilterBar class="mb-4 rounded-lg border border-border-default">
            <Select
                v-model="employeeFilter"
                :options="employeeOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('hrm.attendance.list.columns.employee')"
                :loading="employeesQuery.isLoading.value"
                show-clear
                filter
                class="w-64"
                data-testid="attendance-list-employee-filter"
                @change="resetPage"
            />
            <Select
                v-model="statusFilter"
                :options="statusOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('hrm.attendance.list.filters.status')"
                show-clear
                class="w-48"
                data-testid="attendance-list-status-filter"
                @change="resetPage"
            />
            <!-- Date range — two pickers. Reuses dateConversion's
                 stringToDate / dateToYYYYMMDD so the filter state stays
                 as YYYY-MM-DD strings (matching the backend params),
                 and the picker UI shows Date objects. -->
            <DatePicker
                :model-value="stringToDate(fromFilter)"
                date-format="yy-mm-dd"
                show-icon
                show-button-bar
                :placeholder="t('hrm.attendance.list.filters.from')"
                class="w-44"
                input-class="w-full"
                data-testid="attendance-list-from-filter"
                @update:model-value="
                    (d) => {
                        fromFilter = dateToYYYYMMDD(d as Date | null);
                        resetPage();
                    }
                "
            />
            <DatePicker
                :model-value="stringToDate(toFilter)"
                date-format="yy-mm-dd"
                show-icon
                show-button-bar
                :placeholder="t('hrm.attendance.list.filters.to')"
                class="w-44"
                input-class="w-full"
                data-testid="attendance-list-to-filter"
                @update:model-value="
                    (d) => {
                        toFilter = dateToYYYYMMDD(d as Date | null);
                        resetPage();
                    }
                "
            />
        </FilterBar>

        <div
            v-if="showWelcomeEmpty"
            class="rounded-lg border border-border-default bg-surface"
            data-testid="attendance-list-welcome-empty"
        >
            <EmptyState
                icon="pi pi-clock"
                :title="t('hrm.attendance.list.empty.title')"
                :description="t('hrm.attendance.list.empty.description')"
            >
                <template v-if="canCreate" #actions>
                    <Button
                        :label="t('hrm.attendance.list.empty.action')"
                        icon="pi pi-plus"
                        data-testid="attendance-list-empty-create"
                        @click="navigateToNew"
                    />
                </template>
            </EmptyState>
        </div>
        <div v-else class="rounded-lg border border-border-default bg-surface">
            <DataTable
                :data="rows"
                :columns="columns"
                :loading="isLoading"
                :error="errorMessage"
                :empty="tableEmptyOverride"
                mode="server"
                :page="page"
                :page-size="perPage"
                :total="total"
                :row-actions="rowActions"
                data-testid="attendance-list-table"
                @update:page="page = $event"
                @update:page-size="perPage = $event"
                @row-click="(row: AttendanceRecordBrief) => navigateToDetail(row.id)"
                @retry="refetch"
            >
                <!-- Employee — name + code; "(deleted employee)" fallback
                     for soft-deleted parent rows so the row stays scannable. -->
                <template #cell-employee_name="{ row }">
                    <button
                        type="button"
                        class="block max-w-[28ch] truncate text-left hover:underline focus:outline-none focus:underline"
                        :title="row.employee_name ?? t('hrm.attendance.list.deletedEmployeePlaceholder')"
                        :data-testid="`attendance-list-employee-${row.id}`"
                        @click.stop="navigateToDetail(row.id)"
                    >
                        <span v-if="row.employee_name" class="text-text-primary font-medium">
                            {{ row.employee_name }}
                        </span>
                        <span v-else class="text-text-tertiary italic">
                            {{ t('hrm.attendance.list.deletedEmployeePlaceholder') }}
                        </span>
                        <span
                            v-if="row.employee_code"
                            class="ml-2 text-xs text-text-tertiary tabular-nums"
                        >{{ row.employee_code }}</span>
                    </button>
                </template>

                <template #cell-date="{ row }">
                    <span class="text-sm tabular-nums">
                        <DateDisplay :date="row.date" format="short" />
                    </span>
                </template>

                <!-- Clock times — HH:MM display (drop the :SS in the table
                     for compactness; detail page shows full HH:MM:SS).
                     Empty for null. -->
                <template #cell-clock_in="{ row }">
                    <span v-if="row.clock_in" class="text-sm tabular-nums">{{ row.clock_in.slice(0, 5) }}</span>
                    <span v-else class="text-text-tertiary">{{ t('hrm.attendance.list.noClockTime') }}</span>
                </template>

                <template #cell-clock_out="{ row }">
                    <span v-if="row.clock_out" class="text-sm tabular-nums">{{ row.clock_out.slice(0, 5) }}</span>
                    <span v-else class="text-text-tertiary">{{ t('hrm.attendance.list.noClockTime') }}</span>
                </template>

                <template #cell-status="{ row }">
                    <StatusBadge
                        :severity="statusSeverity(row.status)"
                        :label="statusLabel(row.status)"
                        :data-testid="`attendance-list-status-${row.id}`"
                    />
                </template>
            </DataTable>
        </div>
    </PageLayout>
</template>
