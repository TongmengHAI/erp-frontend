<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
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
import { formatLeaveRequestDateLabel } from '@/modules/hrm/composables/useLeaveRequestDateLabel';
import type {
    DataTableColumn,
    RowAction,
} from '@/shared/components/data-table/types';
import {
    useDeleteLeaveRequest,
    useLeaveRequestsQuery,
} from '@/modules/hrm/composables/useLeaveRequests';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type {
    LeaveRequestBrief,
    LeaveRequestListParams,
    LeaveRequestStatus,
    LeaveType,
} from '@/modules/hrm/types/leaveRequest';
import {
    LEAVE_REQUEST_STATUSES,
    LEAVE_TYPES,
} from '@/modules/hrm/types/leaveRequest';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';

// ─────────────────────────────────────────────────────────────────────────────
// LeaveRequestListPage — paginated list with status + type filters.
//
// Default sort is created_at DESC (backend default) — newest pending
// requests rise to the top of the list, which is what a manager opening
// their inbox wants to see.
//
// State machine in the list: status column renders a localized badge per
// row (Pending: warning, Approved: success, Rejected: danger). The
// "Decided by" column shows the approver name + decision date for decided
// rows; pending rows render "—". Soft-deleted employees render with a
// localized placeholder so the row remains scannable instead of showing
// a blank cell — same "honesty over emptiness" rule as the Employee
// list's department_name column.
//
// Decide actions (approve/reject) live on the detail page, not on row
// kebabs. Rationale: the decision flow needs the optional note Textarea
// which doesn't fit a kebab popover, and surfacing two terminal
// transitions in a row kebab encourages careless clicks. The list is
// for triage; the detail page is for decision.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const { confirmDelete } = useAppConfirm();
const deleteMutation = useDeleteLeaveRequest();

// ─── Filter state ───────────────────────────────────────────────────────────
const statusFilter = ref<LeaveRequestStatus | null>(null);
const typeFilter = ref<LeaveType | null>(null);
const page = ref(1);
const perPage = ref(25);

function resetPage(): void {
    page.value = 1;
}

interface StatusOption {
    value: LeaveRequestStatus | null;
    label: string;
}
const statusOptions = computed<StatusOption[]>(() => [
    { value: null, label: t('hrm.leaveRequest.list.filters.anyStatus') },
    ...LEAVE_REQUEST_STATUSES.map((s) => ({
        value: s,
        label: t(`hrm.leaveRequest.status.${s}`),
    })),
]);

interface TypeOption {
    value: LeaveType | null;
    label: string;
}
const typeOptions = computed<TypeOption[]>(() => [
    { value: null, label: t('hrm.leaveRequest.list.filters.anyType') },
    ...LEAVE_TYPES.map((tt) => ({
        value: tt,
        label: t(`hrm.leaveRequest.type.${tt}`),
    })),
]);

// ─── Query params (reactive) ───────────────────────────────────────────────
const queryParams = computed<LeaveRequestListParams>(() => {
    const params: LeaveRequestListParams = { page: page.value, per_page: perPage.value };
    if (statusFilter.value !== null) params.status = statusFilter.value;
    if (typeFilter.value !== null) params.leave_type = typeFilter.value;
    return params;
});

const { data, isLoading, isError, refetch } = useLeaveRequestsQuery(queryParams);

// ─── Status badge severity mapping ──────────────────────────────────────────
function statusSeverity(status: LeaveRequestStatus): StatusSeverity {
    switch (status) {
        case 'pending':
            return 'warning';
        case 'approved':
            return 'success';
        case 'rejected':
            return 'danger';
    }
}
function statusLabel(status: LeaveRequestStatus): string {
    return t(`hrm.leaveRequest.status.${status}`);
}
function typeLabel(type: LeaveType): string {
    return t(`hrm.leaveRequest.type.${type}`);
}

// ─── DataTable column config ────────────────────────────────────────────────
const columns = computed<DataTableColumn<LeaveRequestBrief>[]>(() => [
    { field: 'employee_name', label: 'hrm.leaveRequest.list.columns.employee', type: 'custom' },
    { field: 'leave_type', label: 'hrm.leaveRequest.list.columns.type', type: 'custom', width: '120px' },
    { field: 'start_date', label: 'hrm.leaveRequest.list.columns.dates', type: 'custom', width: '220px' },
    // Days column lands right after the date range it summarises. Header
    // copy is "Days" (singular column header); each cell renders as a
    // bare number with tabular-nums + right-align — the column header
    // gives it context, no need to repeat "Days: 3" in every cell.
    { field: 'days_count', label: 'hrm.leaveRequest.list.columns.days', type: 'custom', align: 'right', width: '80px' },
    { field: 'status', label: 'hrm.leaveRequest.list.columns.status', type: 'custom', align: 'center', width: '140px' },
    { field: 'approver_name', label: 'hrm.leaveRequest.list.columns.decidedBy', type: 'custom' },
]);

// ─── Permission-gated row actions ───────────────────────────────────────────
const canEdit = computed<boolean>(() => auth.can('hrm.leave_request.update'));
const canDelete = computed<boolean>(() => auth.can('hrm.leave_request.delete'));

// Row actions: view always; edit uses RowAction.visible to filter to
// pending rows only (backend would 422 on a PATCH to a decided row,
// and surfacing Edit in the kebab on a decided row misleads the
// manager). Delete is permission-only — .delete is the "created in
// error" affordance, allowed on decided rows per the backend's
// edit/delete asymmetry. .approve is intentionally NOT here; the
// decide flow lives on the detail page where the optional note
// Textarea fits naturally.
const rowActions = computed<RowAction<LeaveRequestBrief>[]>(() => {
    const actions: RowAction<LeaveRequestBrief>[] = [
        {
            key: 'view',
            label: 'hrm.leaveRequest.list.actions.view',
            icon: 'pi pi-eye',
            onClick: (row) => navigateToDetail(row.id),
        },
    ];
    if (canEdit.value) {
        actions.push({
            key: 'edit',
            label: 'hrm.leaveRequest.list.actions.edit',
            icon: 'pi pi-pencil',
            visible: (row) => row.status === 'pending',
            onClick: (row) => navigateToEdit(row.id),
        });
    }
    if (canDelete.value) {
        actions.push({
            key: 'delete',
            label: 'hrm.leaveRequest.list.actions.delete',
            icon: 'pi pi-trash',
            severity: 'danger',
            onClick: (row) => onDelete(row),
        });
    }
    return actions;
});

function navigateToDetail(id: number): void {
    void router.push({ name: HRM_ROUTES.LEAVE_REQUEST_DETAIL, params: { id } });
}
function navigateToNew(): void {
    void router.push({ name: HRM_ROUTES.LEAVE_REQUEST_NEW });
}
function navigateToEdit(id: number): void {
    void router.push({ name: HRM_ROUTES.LEAVE_REQUEST_EDIT, params: { id } });
}

function onDelete(row: LeaveRequestBrief): void {
    confirmDelete({
        message: t('hrm.leaveRequest.delete.confirmMessage'),
        acceptLabel: t('hrm.leaveRequest.delete.confirmAction'),
        onAccept: async () => {
            try {
                await deleteMutation.mutateAsync(row.id);
                toast.add({
                    severity: 'success',
                    summary: t('hrm.leaveRequest.delete.toast.success'),
                    life: 3000,
                });
            } catch {
                toast.add({
                    severity: 'error',
                    summary: t('hrm.leaveRequest.delete.toast.error'),
                    life: 4000,
                });
            }
        },
    });
}

const rows = computed<LeaveRequestBrief[]>(() => data.value?.data ?? []);
const total = computed<number>(() => data.value?.meta.total ?? 0);
const hasFilters = computed<boolean>(
    () => statusFilter.value !== null || typeFilter.value !== null,
);
const canCreate = computed<boolean>(() => auth.can('hrm.leave_request.create'));

const errorMessage = computed<string | null>(() => (isError.value ? '' : null));

const showWelcomeEmpty = computed<boolean>(
    () => !isLoading.value && !isError.value && total.value === 0 && !hasFilters.value,
);

const tableEmptyOverride = computed(() => ({
    icon: 'pi pi-search',
    title: t('hrm.leaveRequest.list.filteredEmpty.title'),
    description: t('hrm.leaveRequest.list.filteredEmpty.description'),
}));
</script>

<template>
    <PageLayout>
        <PageHeader
            :title="t('hrm.leaveRequest.list.title')"
            :subtitle="t('hrm.leaveRequest.list.subtitle')"
        >
            <template #actions>
                <Button
                    v-if="canCreate"
                    :label="t('hrm.leaveRequest.list.newAction')"
                    icon="pi pi-plus"
                    data-testid="leave-request-list-new-button"
                    @click="navigateToNew"
                />
            </template>
        </PageHeader>

        <FilterBar class="mb-4 rounded-lg border border-border-default">
            <Select
                v-model="statusFilter"
                :options="statusOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('hrm.leaveRequest.list.filters.status')"
                show-clear
                class="w-56"
                data-testid="leave-request-list-status-filter"
                @change="resetPage"
            />
            <Select
                v-model="typeFilter"
                :options="typeOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('hrm.leaveRequest.list.filters.leaveType')"
                show-clear
                class="w-56"
                data-testid="leave-request-list-type-filter"
                @change="resetPage"
            />
        </FilterBar>

        <div
            v-if="showWelcomeEmpty"
            class="rounded-lg border border-border-default bg-surface"
            data-testid="leave-request-list-welcome-empty"
        >
            <EmptyState
                icon="pi pi-calendar"
                :title="t('hrm.leaveRequest.list.empty.title')"
                :description="t('hrm.leaveRequest.list.empty.description')"
            >
                <template v-if="canCreate" #actions>
                    <Button
                        :label="t('hrm.leaveRequest.list.empty.action')"
                        icon="pi pi-plus"
                        data-testid="leave-request-list-empty-create"
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
                data-testid="leave-request-list-table"
                @update:page="page = $event"
                @update:page-size="perPage = $event"
                @row-click="(row: LeaveRequestBrief) => navigateToDetail(row.id)"
                @retry="refetch"
            >
                <!-- Employee — name + code; "(deleted employee)" fallback
                     for soft-deleted parents. The cell is still a navigable
                     link to the detail page; the request stays visible
                     even after the employee row was archived. -->
                <template #cell-employee_name="{ row }">
                    <button
                        type="button"
                        class="block max-w-[28ch] truncate text-left hover:underline focus:outline-none focus:underline"
                        :title="row.employee_name ?? t('hrm.leaveRequest.list.deletedEmployeePlaceholder')"
                        :data-testid="`leave-request-list-employee-${row.id}`"
                        @click.stop="navigateToDetail(row.id)"
                    >
                        <span v-if="row.employee_name" class="text-text-primary font-medium">
                            {{ row.employee_name }}
                        </span>
                        <span v-else class="text-text-tertiary italic">
                            {{ t('hrm.leaveRequest.list.deletedEmployeePlaceholder') }}
                        </span>
                        <span
                            v-if="row.employee_code"
                            class="ml-2 text-xs text-text-tertiary tabular-nums"
                        >{{ row.employee_code }}</span>
                    </button>
                </template>

                <template #cell-leave_type="{ row }">
                    <span class="text-sm">{{ typeLabel(row.leave_type) }}</span>
                </template>

                <!-- Dates — driven by the shared date-label formatter so
                     half-day requests render "Fri, May 22 (Morning)" and
                     full-day requests render either "Fri, May 22" (single)
                     or "Fri, May 22 → Fri, May 26" (range). Same logic the
                     detail page uses; one source of truth for the format. -->
                <template #cell-start_date="{ row }">
                    <span class="text-sm tabular-nums">
                        {{ formatLeaveRequestDateLabel({
                            start_date: row.start_date,
                            end_date: row.end_date,
                            day_part: row.day_part,
                        }, t) }}
                    </span>
                </template>

                <!-- Days — calendar-day count, derived server-side from
                     dates + day_part. Right-aligned + tabular-nums so a
                     column of "0.5 / 3.0 / 14.0" stacks cleanly. Title
                     attribute carries the labelled form for screen
                     readers + hover. -->
                <template #cell-days_count="{ row }">
                    <span
                        class="text-sm tabular-nums"
                        :title="t('hrm.leaveRequest.list.daysTitle', { n: row.days_count })"
                        :data-testid="`leave-request-list-days-${row.id}`"
                    >{{ row.days_count }}</span>
                </template>

                <template #cell-status="{ row }">
                    <StatusBadge
                        :severity="statusSeverity(row.status)"
                        :label="statusLabel(row.status)"
                        :data-testid="`leave-request-list-status-${row.id}`"
                    />
                </template>

                <!-- Decided by — approver + decision date for decided rows,
                     "—" for pending. The whole row hits the detail page on
                     click, so this column is informational only (no link). -->
                <template #cell-approver_name="{ row }">
                    <div v-if="row.approver_name" class="text-sm">
                        <div class="text-text-primary">{{ row.approver_name }}</div>
                        <div class="text-xs text-text-tertiary">
                            <DateDisplay :date="row.approved_at!" format="short" />
                        </div>
                    </div>
                    <div v-else-if="row.approved_at" class="text-sm">
                        <!-- approved_at set but no approver name → user
                             was hard-deleted (ON DELETE SET NULL on the FK).
                             Decision still stands; we just can't attribute. -->
                        <div class="text-text-tertiary italic">
                            {{ t('hrm.leaveRequest.detail.deletedApprover') }}
                        </div>
                        <div class="text-xs text-text-tertiary">
                            <DateDisplay :date="row.approved_at" format="short" />
                        </div>
                    </div>
                    <span v-else class="text-text-tertiary">
                        {{ t('hrm.leaveRequest.list.decidedByEmpty') }}
                    </span>
                </template>
            </DataTable>
        </div>
    </PageLayout>
</template>
