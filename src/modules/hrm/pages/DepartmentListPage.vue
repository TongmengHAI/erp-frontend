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
    useDeleteDepartment,
    useDepartmentsQuery,
} from '@/modules/hrm/composables/useDepartments';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type {
    DepartmentBrief,
    DepartmentListParams,
    DepartmentStatus,
} from '@/modules/hrm/types/department';
import { DEPARTMENT_STATUSES } from '@/modules/hrm/types/department';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';

// ─────────────────────────────────────────────────────────────────────────────
// DepartmentListPage — paginated department list with search + status filter.
//
// Direct transposition of EmployeeListPage:
//   - Same DataTable wiring
//   - Same status badge mapping pattern (just two values instead of three)
//   - Same row-actions kebab (View / Edit / Delete, permission-gated)
//   - Same welcome-empty / filtered-empty split
//   - Same name + code truncation guard on free-text cells
//
// No date columns — Departments have no `hire_date` equivalent.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const { confirmDelete } = useAppConfirm();
const deleteMutation = useDeleteDepartment();

// ─── Filter state ───────────────────────────────────────────────────────────
const searchInput = ref('');
const statusFilter = ref<DepartmentStatus | null>(null);
const page = ref(1);
const perPage = ref(25);

function resetPage(): void {
    page.value = 1;
}

// ─── Status filter options ──────────────────────────────────────────────────
interface StatusOption {
    value: DepartmentStatus | null;
    label: string;
}
const statusOptions = computed<StatusOption[]>(() => [
    { value: null, label: t('hrm.department.list.filters.anyStatus') },
    ...DEPARTMENT_STATUSES.map((s) => ({
        value: s,
        label: t(`hrm.department.status.${s}`),
    })),
]);

// ─── Query params (reactive) ────────────────────────────────────────────────
const queryParams = computed<DepartmentListParams>(() => {
    const params: DepartmentListParams = { page: page.value, per_page: perPage.value };
    const trimmed = searchInput.value.trim();
    if (trimmed !== '') params.search = trimmed;
    if (statusFilter.value !== null) params.status = statusFilter.value;
    return params;
});

const { data, isLoading, isError, refetch } = useDepartmentsQuery(queryParams);

// ─── Status badge severity ──────────────────────────────────────────────────
// Two values vs Employee's three; mapping shape identical.
function statusSeverity(status: DepartmentStatus): StatusSeverity {
    switch (status) {
        case 'active':
            return 'success';
        case 'archived':
            return 'neutral';
    }
}

function statusLabel(status: DepartmentStatus): string {
    return t(`hrm.department.status.${status}`);
}

// ─── Permission-gated row actions ───────────────────────────────────────────
const canEdit = computed<boolean>(() => auth.can('hrm.department.update'));
const canDelete = computed<boolean>(() => auth.can('hrm.department.delete'));

const rowActions = computed<RowAction<DepartmentBrief>[]>(() => {
    const actions: RowAction<DepartmentBrief>[] = [
        {
            key: 'view',
            label: 'hrm.department.list.actions.view',
            icon: 'pi pi-eye',
            onClick: (row) => navigateToDetail(row.id),
        },
    ];
    if (canEdit.value) {
        actions.push({
            key: 'edit',
            label: 'hrm.department.list.actions.edit',
            icon: 'pi pi-pencil',
            onClick: (row) => navigateToEdit(row.id),
        });
    }
    if (canDelete.value) {
        actions.push({
            key: 'delete',
            label: 'hrm.department.list.actions.delete',
            icon: 'pi pi-trash',
            severity: 'danger',
            onClick: (row) => onDelete(row),
        });
    }
    return actions;
});

// ─── DataTable column config ────────────────────────────────────────────────
// Code, name, and status as `custom` cells so we control rendering
// (clickable buttons + localized badge label). No date column.
const columns = computed<DataTableColumn<DepartmentBrief>[]>(() => [
    { field: 'code', label: 'hrm.department.list.columns.code', type: 'custom', width: '160px' },
    { field: 'name', label: 'hrm.department.list.columns.name', type: 'custom' },
    { field: 'status', label: 'hrm.department.list.columns.status', type: 'custom', align: 'center', width: '140px' },
]);

function navigateToDetail(id: number): void {
    void router.push({ name: HRM_ROUTES.DEPARTMENT_DETAIL, params: { id } });
}

function navigateToNew(): void {
    void router.push({ name: HRM_ROUTES.DEPARTMENT_NEW });
}

function navigateToEdit(id: number): void {
    void router.push({ name: HRM_ROUTES.DEPARTMENT_EDIT, params: { id } });
}

function onDelete(row: DepartmentBrief): void {
    confirmDelete({
        message: t('hrm.department.delete.confirmMessage', { name: row.name }),
        acceptLabel: t('hrm.department.delete.confirmAction'),
        onAccept: async () => {
            try {
                await deleteMutation.mutateAsync(row.id);
                toast.add({
                    severity: 'success',
                    summary: t('hrm.department.delete.toast.success'),
                    life: 3000,
                });
            } catch {
                toast.add({
                    severity: 'error',
                    summary: t('hrm.department.delete.toast.error'),
                    life: 4000,
                });
            }
        },
    });
}

const rows = computed<DepartmentBrief[]>(() => data.value?.data ?? []);
const total = computed<number>(() => data.value?.meta.total ?? 0);
const hasFilters = computed<boolean>(
    () => searchInput.value.trim() !== '' || statusFilter.value !== null,
);
const canCreate = computed<boolean>(() => auth.can('hrm.department.create'));
const errorMessage = computed<string | null>(() => (isError.value ? '' : null));

const showWelcomeEmpty = computed<boolean>(
    () => !isLoading.value && !isError.value && total.value === 0 && !hasFilters.value,
);

// Distinct filtered-empty copy — same pattern as Employee's polish fix:
// "No matching departments / Try clearing the search or status filter."
const tableEmptyOverride = computed(() => ({
    icon: 'pi pi-search',
    title: t('hrm.department.list.filteredEmpty.title'),
    description: t('hrm.department.list.filteredEmpty.description'),
}));
</script>

<template>
    <PageLayout>
        <PageHeader
            :title="t('hrm.department.list.title')"
            :subtitle="t('hrm.department.list.subtitle')"
        >
            <template #actions>
                <Button
                    v-if="canCreate"
                    :label="t('hrm.department.list.newAction')"
                    icon="pi pi-plus"
                    data-testid="department-list-new-button"
                    @click="navigateToNew"
                />
            </template>
        </PageHeader>

        <FilterBar class="mb-4 rounded-lg border border-border-default">
            <InputText
                v-model="searchInput"
                :placeholder="t('hrm.department.list.search.placeholder')"
                :aria-label="t('hrm.department.list.search.label')"
                class="w-72"
                data-testid="department-list-search"
                @input="resetPage"
            />
            <Select
                v-model="statusFilter"
                :options="statusOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('hrm.department.list.filters.status')"
                show-clear
                class="w-56"
                data-testid="department-list-status-filter"
                @change="resetPage"
            />
        </FilterBar>

        <div
            v-if="showWelcomeEmpty"
            class="rounded-lg border border-border-default bg-surface"
            data-testid="department-list-welcome-empty"
        >
            <EmptyState
                icon="pi pi-sitemap"
                :title="t('hrm.department.list.empty.title')"
                :description="t('hrm.department.list.empty.description')"
            >
                <template v-if="canCreate" #actions>
                    <Button
                        :label="t('hrm.department.list.empty.action')"
                        icon="pi pi-plus"
                        data-testid="department-list-empty-create"
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
                data-testid="department-list-table"
                @update:page="page = $event"
                @update:page-size="perPage = $event"
                @row-click="(row) => navigateToDetail(row.id)"
                @retry="refetch"
            >
                <template #cell-code="{ row }">
                    <button
                        type="button"
                        class="text-brand hover:underline focus:outline-none focus:underline tabular-nums"
                        :data-testid="`department-list-code-${row.id}`"
                        @click.stop="navigateToDetail(row.id)"
                    >
                        {{ row.code }}
                    </button>
                </template>

                <template #cell-name="{ row }">
                    <button
                        type="button"
                        class="block max-w-[28ch] truncate text-left text-text-primary font-medium hover:underline focus:outline-none focus:underline"
                        :title="row.name"
                        :data-testid="`department-list-name-${row.id}`"
                        @click.stop="navigateToDetail(row.id)"
                    >
                        {{ row.name }}
                    </button>
                </template>

                <template #cell-status="{ row }">
                    <StatusBadge
                        :severity="statusSeverity(row.status)"
                        :label="statusLabel(row.status)"
                        :data-testid="`department-list-status-${row.id}`"
                    />
                </template>
            </DataTable>
        </div>
    </PageLayout>
</template>
