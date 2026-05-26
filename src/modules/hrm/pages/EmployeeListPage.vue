<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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
import FilterChip from '@/shared/components/data-display/FilterChip.vue';
import type {
    DataTableColumn,
    RowAction,
} from '@/shared/components/data-table/types';
import {
    useDeleteEmployee,
    useEmployeesQuery,
} from '@/modules/hrm/composables/useEmployees';
import { useDepartmentQuery } from '@/modules/hrm/composables/useDepartments';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type {
    EmployeeBrief,
    EmployeeListParams,
    EmployeeStatus,
} from '@/modules/hrm/types/employee';
import { EMPLOYEE_STATUSES } from '@/modules/hrm/types/employee';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';
import { useUrlNumericFilter } from '@/shared/composables/useUrlNumericFilter';

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

// Department filter — URL-driven, no UI control on this page. The
// Department detail page's "View employees" link arrives here with
// ?department_id=N; clearing happens via the in-page FilterChip's [×]
// button. URL state + clear() come from the shared useUrlNumericFilter
// composable; visual chip from the shared FilterChip component. Same
// pattern applies to future filters (position_id lands in Session 3).
const { value: departmentIdFilter, clear: clearDepartmentFilter } =
    useUrlNumericFilter('department_id');

// Look up the filtered department's name for the chip label. Falls back
// to displaying the id if the lookup fails (deleted department, wrong
// tenant) — the chip stays functional either way.
const filteredDepartmentQuery = useDepartmentQuery(
    () => departmentIdFilter.value ?? 0,
);
const filteredDepartmentName = computed<string | null>(
    () => filteredDepartmentQuery.data.value?.data?.name ?? null,
);

// Reset to page 1 when the department filter changes via URL. Critical
// for back/forward navigation through filtered-vs-unfiltered states —
// otherwise switching filters can leave you on page 3 of zero results.
watch(departmentIdFilter, () => {
    page.value = 1;
});

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
    if (departmentIdFilter.value !== null) params.department_id = departmentIdFilter.value;
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
// full_name and job_title are free-text columns where a long entry
// could push table layout during the demo. Both render as custom cells
// with `truncate` + `max-w-[28ch]` (CSS truncation, native browser
// ellipsis). The full row stays clickable via `row-click`, and the
// detail page shows the untruncated value, so no information loss.
// Department column lives between Name and Job Title — reading order
// "who → which team → which role" is the natural left-to-right scan.
// Custom cell renders `—` for null and truncates long names.
const columns = computed<DataTableColumn<EmployeeBrief>[]>(() => [
    { field: 'employee_code', label: 'hrm.employee.list.columns.code', type: 'custom', width: '140px' },
    { field: 'full_name', label: 'hrm.employee.list.columns.name', type: 'custom' },
    { field: 'department_name', label: 'hrm.employee.list.columns.department', type: 'custom' },
    // The Position column that replaces the old job_title column lands
    // in Session 3 alongside the position chip + filter wiring.
    { field: 'position_title', label: 'hrm.employee.list.columns.position', type: 'custom' },
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
//
// Labels are i18n keys — DataTable wraps them in `t()` before rendering
// (mirrors the column-header behavior). Pass keys, not literals.
const rowActions = computed<RowAction<EmployeeBrief>[]>(() => {
    const actions: RowAction<EmployeeBrief>[] = [
        {
            key: 'view',
            label: 'hrm.employee.list.actions.view',
            icon: 'pi pi-eye',
            onClick: (row) => navigateToDetail(row.id),
        },
    ];
    if (canEdit.value) {
        actions.push({
            key: 'edit',
            label: 'hrm.employee.list.actions.edit',
            icon: 'pi pi-pencil',
            onClick: (row) => navigateToEdit(row.id),
        });
    }
    if (canDelete.value) {
        actions.push({
            key: 'delete',
            label: 'hrm.employee.list.actions.delete',
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

// Filtered-empty messaging is genuinely distinct from welcome-empty:
// employees DO exist, just none match the active filter. The welcome
// copy ("Add your first team member…") would mislead the user into
// thinking the directory was wiped. Distinct title + actionable hint.
const tableEmptyOverride = computed(() => ({
    icon: 'pi pi-search',
    title: t('hrm.employee.list.filteredEmpty.title'),
    description: t('hrm.employee.list.filteredEmpty.description'),
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

        <!-- Department filter chip — only renders when arriving with
             ?department_id= in the URL (the Department detail page's
             "View employees" link). Uses the shared FilterChip component
             + useUrlNumericFilter composable. Same pattern will be used
             for the position_id chip in Session 3. -->
        <FilterChip
            v-if="departmentIdFilter !== null"
            class="mb-4"
            :label="t('hrm.employee.list.departmentFilterChip', {
                name: filteredDepartmentName ?? `#${departmentIdFilter}`,
            })"
            :clear-aria-label="t('hrm.employee.list.clearDepartmentFilter')"
            data-testid="employee-list-department-filter-chip"
            @clear="clearDepartmentFilter"
        />

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
                     because each button has a distinct accessible name.
                     `truncate` + `max-w-[28ch]` caps display width;
                     `title` exposes the full name on hover for users
                     who land on a row with a long entry. -->
                <template #cell-full_name="{ row }">
                    <button
                        type="button"
                        class="block max-w-[28ch] truncate text-left text-text-primary font-medium hover:underline focus:outline-none focus:underline"
                        :title="row.full_name"
                        :data-testid="`employee-list-name-${row.id}`"
                        @click.stop="navigateToDetail(row.id)"
                    >
                        {{ row.full_name }}
                    </button>
                </template>

                <!-- Department — free-text-ish column (the name comes from
                     a related row). Renders "—" for null so the column
                     isn't empty (unlike job_title which renders blank);
                     departments are first-class enough that the absence
                     should read as "no department" intentionally, not as
                     "missing data." Same truncation guard. -->
                <template #cell-department_name="{ row }">
                    <span
                        v-if="row.department_name"
                        class="block max-w-[20ch] truncate"
                        :title="row.department_name"
                    >
                        {{ row.department_name }}
                    </span>
                    <span v-else class="text-text-tertiary">—</span>
                </template>

                <!-- Position — same truncation guard as the old job_title
                     cell. Null renders blank (consistent with the column's
                     established "no value = empty" convention; detail page
                     surfaces the "—" affordance). The cell becomes a
                     clickable Position link in Session 3 alongside the
                     filter-chip wiring. -->
                <template #cell-position_title="{ row }">
                    <span
                        v-if="row.position_title"
                        class="block max-w-[28ch] truncate"
                        :title="row.position_title"
                    >
                        {{ row.position_title }}
                    </span>
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
