<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
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
import type {
    DataTableColumn,
    RowAction,
} from '@/shared/components/data-table/types';
import {
    useDeleteEmployee,
    useEmployeesQuery,
} from '@/modules/hrm/composables/useEmployees';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type {
    EmployeeBrief,
    EmployeeListParams,
    EmployeeStatus,
} from '@/modules/hrm/types/employee';
import { EMPLOYEE_STATUSES } from '@/modules/hrm/types/employee';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';

// ─────────────────────────────────────────────────────────────────────────────
// EmployeeListPage — paginated employee list with search + status filter.
//
// Server-mode pagination: TanStack Query is the source of truth, params
// flow through the URL of the request, the backend returns the paginated
// slice. Local sort isn't wired up — the API doesn't take a sort param
// (default is `ORDER BY full_name`), so the column headers are non-clickable
// for now. When ?sort= lands on the backend we wire it in.
//
// The five-state matrix (loading / populated / empty / error / permission-
// denied) is split between this component and lower layers:
//   - loading  — DataTable's loading slot (skeleton rows)
//   - error    — DataTable's error slot (with retry)
//   - empty    — EmptyState in DataTable's empty slot
//   - populated — DataTable rows
//   - permission denied — route guard intercepts at navigation; if a user
//     hits this page, they have hrm.employee.view by definition. The
//     in-page check on the New Employee button covers the narrower
//     "can list but can't create" case.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const { confirmDelete } = useAppConfirm();
const deleteMutation = useDeleteEmployee();

// ─── Filter state ───────────────────────────────────────────────────────────
const searchInput = ref('');
const statusFilter = ref<EmployeeStatus | null>(null);
const page = ref(1);
const perPage = ref(25);

// Reset page to 1 whenever filters change — otherwise filtering down to
// 2 results while on page 3 leaves the user staring at an empty page.
function resetPage(): void {
    page.value = 1;
}

// ─── Status filter options ──────────────────────────────────────────────────
interface StatusOption {
    value: EmployeeStatus | null;
    label: string;
}
const statusOptions = computed<StatusOption[]>(() => [
    { value: null, label: t('hrm.employee.list.filters.anyStatus') },
    ...EMPLOYEE_STATUSES.map((s) => ({
        value: s,
        label: t(`hrm.employee.status.${s}`),
    })),
]);

// ─── Query params (reactive — TanStack refetches on change) ────────────────
const queryParams = computed<EmployeeListParams>(() => {
    const params: EmployeeListParams = { page: page.value, per_page: perPage.value };
    const trimmed = searchInput.value.trim();
    if (trimmed !== '') params.search = trimmed;
    if (statusFilter.value !== null) params.status = statusFilter.value;
    return params;
});

const { data, isLoading, isError, refetch } = useEmployeesQuery(queryParams);

// ─── Status badge severity mapping ──────────────────────────────────────────
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

// ─── DataTable column config ────────────────────────────────────────────────
// Code, name, and status all use `custom` cells so we control the rendering:
// - Code + name: clickable buttons that navigate to detail.
// - Status: a localized StatusBadge label (the built-in 'status' type would
//   surface the raw enum string, which is wrong for display).
// Hire date renders via the built-in 'date' type with the short format.
const columns = computed<DataTableColumn<EmployeeBrief>[]>(() => [
    { field: 'employee_code', label: 'hrm.employee.list.columns.code', type: 'custom', width: '140px' },
    { field: 'full_name', label: 'hrm.employee.list.columns.name', type: 'custom' },
    { field: 'job_title', label: 'hrm.employee.list.columns.jobTitle', type: 'text' },
    { field: 'status', label: 'hrm.employee.list.columns.status', type: 'custom', align: 'center', width: '140px' },
    {
        field: 'hire_date',
        label: 'hrm.employee.list.columns.hireDate',
        type: 'date',
        dateFormat: 'short',
        width: '140px',
    },
]);

// ─── Permission-gated row actions ───────────────────────────────────────────
const canEdit = computed<boolean>(() => auth.can('hrm.employee.update'));
const canDelete = computed<boolean>(() => auth.can('hrm.employee.delete'));

// Visibility predicates live on individual actions (see DataTable's
// RowAction.visible). Build the kebab menu reactively so role changes
// during a session reflow it without a remount.
const rowActions = computed<RowAction<EmployeeBrief>[]>(() => {
    const actions: RowAction<EmployeeBrief>[] = [
        {
            key: 'view',
            label: 'hrm.employee.detail.edit',
            icon: 'pi pi-eye',
            onClick: (row) => navigateToDetail(row.id),
        },
    ];
    if (canEdit.value) {
        actions.push({
            key: 'edit',
            label: 'hrm.employee.detail.edit',
            icon: 'pi pi-pencil',
            onClick: (row) => navigateToEdit(row.id),
        });
    }
    if (canDelete.value) {
        actions.push({
            key: 'delete',
            label: 'hrm.employee.detail.delete',
            icon: 'pi pi-trash',
            severity: 'danger',
            onClick: (row) => onDelete(row),
        });
    }
    return actions;
});

function navigateToDetail(id: number): void {
    void router.push({ name: HRM_ROUTES.EMPLOYEE_DETAIL, params: { id } });
}

function navigateToNew(): void {
    void router.push({ name: HRM_ROUTES.EMPLOYEE_NEW });
}

function navigateToEdit(id: number): void {
    void router.push({ name: HRM_ROUTES.EMPLOYEE_EDIT, params: { id } });
}

function onDelete(row: EmployeeBrief): void {
    confirmDelete({
        message: t('hrm.employee.delete.confirmMessage', { name: row.full_name }),
        acceptLabel: t('hrm.employee.delete.confirmAction'),
        onAccept: async () => {
            try {
                await deleteMutation.mutateAsync(row.id);
                toast.add({
                    severity: 'success',
                    summary: t('hrm.employee.delete.toast.success'),
                    life: 3000,
                });
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

function statusLabel(status: EmployeeStatus): string {
    return t(`hrm.employee.status.${status}`);
}

const rows = computed<EmployeeBrief[]>(() => data.value?.data ?? []);
const total = computed<number>(() => data.value?.meta.total ?? 0);
const hasFilters = computed<boolean>(
    () => searchInput.value.trim() !== '' || statusFilter.value !== null,
);

const canCreate = computed<boolean>(() => auth.can('hrm.employee.create'));

// Error message for the DataTable's error region. Don't leak raw API
// errors — generic friendly string per §7.K.
const errorMessage = computed<string | null>(() => (isError.value ? '' : null));

/**
 * Two-tier empty rendering:
 *
 *   - "First-employee onboarding" — no rows AND no filters. We render our
 *     own EmptyState OUTSIDE the DataTable so it can include a primary
 *     "Create first employee" CTA (the wrapper's built-in empty doesn't
 *     accept action slots).
 *
 *   - "Filtered to nothing" — no rows BUT filters active. We let the
 *     DataTable's own empty state render with a search-pi icon and a
 *     generic message via the `empty` prop. No CTA — the user can clear
 *     the filter instead.
 */
const showWelcomeEmpty = computed<boolean>(
    () => !isLoading.value && !isError.value && total.value === 0 && !hasFilters.value,
);

const tableEmptyOverride = computed(() => ({
    icon: 'pi pi-search',
    title: t('hrm.employee.list.empty.title'),
    description: t('hrm.employee.list.empty.description'),
}));
</script>

<template>
    <PageLayout>
        <PageHeader
            :title="t('hrm.employee.list.title')"
            :subtitle="t('hrm.employee.list.subtitle')"
        >
            <template #actions>
                <Button
                    v-if="canCreate"
                    :label="t('hrm.employee.list.newAction')"
                    icon="pi pi-plus"
                    data-testid="employee-list-new-button"
                    @click="navigateToNew"
                />
            </template>
        </PageHeader>

        <FilterBar class="mb-4 rounded-lg border border-border-default">
            <InputText
                v-model="searchInput"
                :placeholder="t('hrm.employee.list.search.placeholder')"
                :aria-label="t('hrm.employee.list.search.label')"
                class="w-72"
                data-testid="employee-list-search"
                @input="resetPage"
            />
            <Select
                v-model="statusFilter"
                :options="statusOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('hrm.employee.list.filters.status')"
                show-clear
                class="w-56"
                data-testid="employee-list-status-filter"
                @change="resetPage"
            />
        </FilterBar>

        <!-- First-employee EmptyState swaps in for the DataTable entirely
             when the company has zero employees AND no filter is active.
             Otherwise the DataTable handles its own empty/loading/error. -->
        <div
            v-if="showWelcomeEmpty"
            class="rounded-lg border border-border-default bg-surface"
            data-testid="employee-list-welcome-empty"
        >
            <EmptyState
                icon="pi pi-users"
                :title="t('hrm.employee.list.empty.title')"
                :description="t('hrm.employee.list.empty.description')"
            >
                <template v-if="canCreate" #actions>
                    <Button
                        :label="t('hrm.employee.list.empty.action')"
                        icon="pi pi-plus"
                        data-testid="employee-list-empty-create"
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
                data-testid="employee-list-table"
                @update:page="page = $event"
                @update:page-size="perPage = $event"
                @row-click="(row) => navigateToDetail(row.id)"
                @retry="refetch"
            >
                <!-- Employee code as a link to the detail page. Standard
                     ERP pattern: the identifier column is the affordance. -->
                <template #cell-employee_code="{ row }">
                    <button
                        type="button"
                        class="text-brand hover:underline focus:outline-none focus:underline tabular-nums"
                        :data-testid="`employee-list-code-${row.id}`"
                        @click.stop="navigateToDetail(row.id)"
                    >
                        {{ row.employee_code }}
                    </button>
                </template>

                <!-- Full name as a parallel link affordance. Two-link cells
                     are fine when both encode the same target (detail
                     navigation) — accessibility lints don't flag them
                     because each button has a distinct accessible name. -->
                <template #cell-full_name="{ row }">
                    <button
                        type="button"
                        class="text-text-primary font-medium hover:underline focus:outline-none focus:underline"
                        :data-testid="`employee-list-name-${row.id}`"
                        @click.stop="navigateToDetail(row.id)"
                    >
                        {{ row.full_name }}
                    </button>
                </template>

                <!-- Localized status badge (the column type='custom' so we
                     pick the i18n label instead of the raw enum string). -->
                <template #cell-status="{ row }">
                    <StatusBadge
                        :severity="statusSeverity(row.status)"
                        :label="statusLabel(row.status)"
                        :data-testid="`employee-list-status-${row.id}`"
                    />
                </template>
            </DataTable>
        </div>
    </PageLayout>
</template>
