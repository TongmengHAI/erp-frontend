<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import { useToast } from 'primevue/usetoast';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import FilterBar from '@/shared/components/layout/FilterBar.vue';
import EmptyState from '@/shared/components/state/EmptyState.vue';
import DataTable from '@/shared/components/data-table/DataTable.vue';
import FilterChip from '@/shared/components/data-display/FilterChip.vue';
import type {
    DataTableColumn,
    RowAction,
} from '@/shared/components/data-table/types';
import {
    useDeleteLeaveBalance,
    useLeaveBalancesQuery,
} from '@/modules/hrm/composables/useLeaveBalances';
import { useEmployeeQuery, useEmployeesQuery } from '@/modules/hrm/composables/useEmployees';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type {
    BalanceLeaveType,
    LeaveBalanceBrief,
    LeaveBalanceListParams,
} from '@/modules/hrm/types/leaveBalance';
import { BALANCE_LEAVE_TYPES } from '@/modules/hrm/types/leaveBalance';
import {
    balanceSeverity,
    formatRemainingDays,
} from '@/modules/hrm/utils/leaveBalanceDisplay';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';
import { useUrlNumericFilter } from '@/shared/composables/useUrlNumericFilter';

// ─────────────────────────────────────────────────────────────────────────────
// LeaveBalanceListPage — six-column list of computed balance rows.
//
//   Employee · Leave Type · Period · Allocated · Consumed · Remaining
//
// Three filters: employee_id (URL-driven, used by EmployeeDetailPage's
// "Manage balances" deep-link → renders as a FilterChip when active),
// leave_type (Select), period_year (InputNumber with show-clear).
//
// The Remaining cell is the load-bearing UX piece: it surfaces the
// over-consumed labeling discipline. Three states:
//   • >= 1   → success colour + "N days remaining"
//   • == 0   → neutral colour + "0 days remaining" (NOT a warning;
//             0 is the valid exact-zero case demonstrated by the
//             seeded E-1002 annual row)
//   • <  0   → danger colour + "Over-consumed by N days" (explicit
//             label, never a bare "-2"). The seeded E-1003 annual
//             (-2) is the visual proof.
//
// All three classifications routed through balanceSeverity() +
// formatRemainingDays() so the threshold logic + copy are single
// source of truth across surfaces.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const { confirmDelete } = useAppConfirm();
const deleteMutation = useDeleteLeaveBalance();

// ─── Filter state ──────────────────────────────────────────────────────────
const typeFilter = ref<BalanceLeaveType | null>(null);
const yearFilter = ref<number | null>(null);
const page = ref(1);
const perPage = ref(25);

// URL-driven employee_id — populated by deep-links from
// EmployeeDetailPage's "Manage balances" footer link. Renders as a
// FilterChip when active; clears via the chip's [×].
const { value: employeeIdFilter, clear: clearEmployeeFilter } =
    useUrlNumericFilter('employee_id');

// Look up the filtered employee's name for the chip label. Falls back
// to displaying the id if the lookup fails (deleted, wrong tenant).
const filteredEmployeeQuery = useEmployeeQuery(
    () => employeeIdFilter.value ?? 0,
);
const filteredEmployeeName = computed<string | null>(
    () => filteredEmployeeQuery.data.value?.data?.full_name ?? null,
);

watch([employeeIdFilter, typeFilter, yearFilter], () => {
    page.value = 1;
});

function resetPage(): void {
    page.value = 1;
}

interface TypeOption {
    value: BalanceLeaveType | null;
    label: string;
}
const typeOptions = computed<TypeOption[]>(() => [
    { value: null, label: t('hrm.leaveBalance.list.filters.anyType') },
    ...BALANCE_LEAVE_TYPES.map((type) => ({
        value: type,
        label: t(`hrm.leaveBalance.leaveType.${type}`),
    })),
]);

// ─── Query params ──────────────────────────────────────────────────────────
const queryParams = computed<LeaveBalanceListParams>(() => {
    const params: LeaveBalanceListParams = { page: page.value, per_page: perPage.value };
    if (employeeIdFilter.value !== null) params.employee_id = employeeIdFilter.value;
    if (typeFilter.value !== null) params.leave_type = typeFilter.value;
    if (yearFilter.value !== null) params.period_year = yearFilter.value;
    return params;
});

const { data, isLoading, isError, refetch } = useLeaveBalancesQuery(queryParams);

// Active employees for cross-reference (e.g. Future enhancement: typeahead).
// Pre-fetched here so the FilterChip lookup is cache-warm.
const _employeesQuery = useEmployeesQuery(() => ({
    status: 'active' as const,
    per_page: 100,
}));
void _employeesQuery;

function typeLabel(type: BalanceLeaveType): string {
    return t(`hrm.leaveBalance.leaveType.${type}`);
}

// ─── DataTable column config ───────────────────────────────────────────────
// Six columns. Numeric columns right-aligned + tabular-nums for stack
// alignment. Period_year width tight because it's always 4 digits.
const columns = computed<DataTableColumn<LeaveBalanceBrief>[]>(() => [
    { field: 'employee_name', label: 'hrm.leaveBalance.list.columns.employee', type: 'custom' },
    { field: 'leave_type', label: 'hrm.leaveBalance.list.columns.type', type: 'custom', width: '120px' },
    { field: 'period_year', label: 'hrm.leaveBalance.list.columns.period', type: 'custom', align: 'center', width: '100px' },
    { field: 'allocated_days', label: 'hrm.leaveBalance.list.columns.allocated', type: 'custom', align: 'right', width: '120px' },
    { field: 'consumed_days', label: 'hrm.leaveBalance.list.columns.consumed', type: 'custom', align: 'right', width: '120px' },
    { field: 'remaining_days', label: 'hrm.leaveBalance.list.columns.remaining', type: 'custom', align: 'right', width: '220px' },
]);

// ─── Permission-gated row actions ──────────────────────────────────────────
const canEdit = computed<boolean>(() => auth.can('hrm.leave_balance.update'));
const canDelete = computed<boolean>(() => auth.can('hrm.leave_balance.delete'));

const rowActions = computed<RowAction<LeaveBalanceBrief>[]>(() => {
    const actions: RowAction<LeaveBalanceBrief>[] = [
        {
            key: 'view',
            label: 'hrm.leaveBalance.list.actions.view',
            icon: 'pi pi-eye',
            onClick: (row) => navigateToDetail(row.id),
        },
    ];
    if (canEdit.value) {
        actions.push({
            key: 'edit',
            label: 'hrm.leaveBalance.list.actions.edit',
            icon: 'pi pi-pencil',
            onClick: (row) => navigateToEdit(row.id),
        });
    }
    if (canDelete.value) {
        actions.push({
            key: 'delete',
            label: 'hrm.leaveBalance.list.actions.delete',
            icon: 'pi pi-trash',
            severity: 'danger',
            onClick: (row) => onDelete(row),
        });
    }
    return actions;
});

function navigateToDetail(id: number): void {
    void router.push({ name: HRM_ROUTES.LEAVE_BALANCE_DETAIL, params: { id } });
}
function navigateToNew(): void {
    void router.push({ name: HRM_ROUTES.LEAVE_BALANCE_NEW });
}
function navigateToEdit(id: number): void {
    void router.push({ name: HRM_ROUTES.LEAVE_BALANCE_EDIT, params: { id } });
}

function onDelete(row: LeaveBalanceBrief): void {
    confirmDelete({
        message: t('hrm.leaveBalance.delete.confirmMessage', {
            employee: row.employee_name ?? '#' + row.employee_id,
            type: typeLabel(row.leave_type),
            year: row.period_year,
        }),
        acceptLabel: t('hrm.leaveBalance.delete.confirmAction'),
        onAccept: async () => {
            try {
                await deleteMutation.mutateAsync(row.id);
                toast.add({
                    severity: 'success',
                    summary: t('hrm.leaveBalance.delete.toast.success'),
                    life: 3000,
                });
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

// Remaining-cell colour classes — derived from balanceSeverity. The
// load-bearing piece: 0 maps to NEUTRAL, not warning.
function remainingCellClasses(remaining: number): string {
    switch (balanceSeverity(remaining)) {
        case 'success':
            return 'text-success-text font-medium';
        case 'neutral':
            return 'text-text-secondary font-medium';
        case 'danger':
            return 'text-danger-text font-semibold';
    }
}

const rows = computed<LeaveBalanceBrief[]>(() => data.value?.data ?? []);
const total = computed<number>(() => data.value?.meta.total ?? 0);
const hasFilters = computed<boolean>(
    () => employeeIdFilter.value !== null
        || typeFilter.value !== null
        || yearFilter.value !== null,
);
const canCreate = computed<boolean>(() => auth.can('hrm.leave_balance.create'));
const errorMessage = computed<string | null>(() => (isError.value ? '' : null));

const showWelcomeEmpty = computed<boolean>(
    () => !isLoading.value && !isError.value && total.value === 0 && !hasFilters.value,
);

const tableEmptyOverride = computed(() => ({
    icon: 'pi pi-search',
    title: t('hrm.leaveBalance.list.filteredEmpty.title'),
    description: t('hrm.leaveBalance.list.filteredEmpty.description'),
}));
</script>

<template>
    <PageLayout>
        <PageHeader
            :title="t('hrm.leaveBalance.list.title')"
            :subtitle="t('hrm.leaveBalance.list.subtitle')"
        >
            <template #actions>
                <Button
                    v-if="canCreate"
                    :label="t('hrm.leaveBalance.list.newAction')"
                    icon="pi pi-plus"
                    data-testid="leave-balance-list-new-button"
                    @click="navigateToNew"
                />
            </template>
        </PageHeader>

        <FilterBar class="mb-4 rounded-lg border border-border-default">
            <Select
                v-model="typeFilter"
                :options="typeOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('hrm.leaveBalance.list.filters.type')"
                show-clear
                class="w-56"
                data-testid="leave-balance-list-type-filter"
                @change="resetPage"
            />
            <InputNumber
                v-model="yearFilter"
                :placeholder="t('hrm.leaveBalance.list.filters.periodYear')"
                :min="2000"
                :max="2100"
                :use-grouping="false"
                show-buttons
                class="w-44"
                input-class="w-full"
                data-testid="leave-balance-list-year-filter"
                @input="resetPage"
            />
        </FilterBar>

        <!-- Employee filter chip — appears when the user deep-linked
             from EmployeeDetailPage's "Manage balances" footer link.
             Clears via the [×]; the underlying URL ?employee_id= is
             stripped at the same time. -->
        <FilterChip
            v-if="employeeIdFilter !== null"
            class="mb-2"
            :label="t('hrm.leaveBalance.list.employeeFilterChip', {
                name: filteredEmployeeName ?? `#${employeeIdFilter}`,
            })"
            :clear-aria-label="t('hrm.leaveBalance.list.clearEmployeeFilter')"
            data-testid="leave-balance-list-employee-filter-chip"
            @clear="clearEmployeeFilter"
        />

        <div
            v-if="showWelcomeEmpty"
            class="rounded-lg border border-border-default bg-surface"
            data-testid="leave-balance-list-welcome-empty"
        >
            <EmptyState
                icon="pi pi-calendar-plus"
                :title="t('hrm.leaveBalance.list.empty.title')"
                :description="t('hrm.leaveBalance.list.empty.description')"
            >
                <template v-if="canCreate" #actions>
                    <Button
                        :label="t('hrm.leaveBalance.list.empty.action')"
                        icon="pi pi-plus"
                        data-testid="leave-balance-list-empty-create"
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
                data-testid="leave-balance-list-table"
                @update:page="page = $event"
                @update:page-size="perPage = $event"
                @row-click="(row: LeaveBalanceBrief) => navigateToDetail(row.id)"
                @retry="refetch"
            >
                <template #cell-employee_name="{ row }">
                    <button
                        type="button"
                        class="block max-w-[28ch] truncate text-left text-text-primary font-medium hover:underline focus:outline-none focus:underline"
                        :title="row.employee_name ?? `#${row.employee_id}`"
                        :data-testid="`leave-balance-list-employee-${row.id}`"
                        @click.stop="navigateToDetail(row.id)"
                    >
                        {{ row.employee_name ?? `#${row.employee_id}` }}
                        <span
                            v-if="row.employee_code"
                            class="ml-2 text-xs text-text-tertiary tabular-nums"
                        >{{ row.employee_code }}</span>
                    </button>
                </template>

                <template #cell-leave_type="{ row }">
                    <span class="text-sm">{{ typeLabel(row.leave_type) }}</span>
                </template>

                <template #cell-period_year="{ row }">
                    <span class="text-sm tabular-nums">{{ row.period_year }}</span>
                </template>

                <template #cell-allocated_days="{ row }">
                    <span class="text-sm tabular-nums">{{ row.allocated_days }}</span>
                </template>

                <template #cell-consumed_days="{ row }">
                    <span class="text-sm tabular-nums">{{ row.consumed_days }}</span>
                </template>

                <!-- LOAD-BEARING: the remaining_days cell renders the
                     over-consumed labeling discipline. balanceSeverity
                     classifies; formatRemainingDays produces the i18n
                     label. Three colour classes — green/neutral/danger
                     map to the three states. Negative numbers NEVER
                     render bare. -->
                <template #cell-remaining_days="{ row }">
                    <span
                        :class="['text-sm tabular-nums', remainingCellClasses(row.remaining_days)]"
                        :data-testid="`leave-balance-list-remaining-${row.id}`"
                        :data-severity="balanceSeverity(row.remaining_days)"
                    >{{ formatRemainingDays(row.remaining_days, t) }}</span>
                </template>
            </DataTable>
        </div>
    </PageLayout>
</template>
