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
    useBranchesQuery,
    useDeleteBranch,
} from '@/modules/hrm/composables/useBranches';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type {
    BranchBrief,
    BranchListParams,
    BranchStatus,
} from '@/modules/hrm/types/branch';
import { BRANCH_STATUSES } from '@/modules/hrm/types/branch';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';

// ─────────────────────────────────────────────────────────────────────────────
// BranchListPage — direct transposition of PositionListPage with one
// extra column (city), justified by city being the natural locator for
// physical locations. Four columns: code, name, city, status.
//
// Search ILIKE-matches name, code, AND city on the backend — the
// placeholder copy reflects all three. Status filter + welcome-empty /
// filtered-empty split mirror Position verbatim.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const { confirmDelete } = useAppConfirm();
const deleteMutation = useDeleteBranch();

// ─── Filter state ───────────────────────────────────────────────────────────
const searchInput = ref('');
const statusFilter = ref<BranchStatus | null>(null);
const page = ref(1);
const perPage = ref(25);

function resetPage(): void {
    page.value = 1;
}

interface StatusOption {
    value: BranchStatus | null;
    label: string;
}
const statusOptions = computed<StatusOption[]>(() => [
    { value: null, label: t('hrm.branch.list.filters.anyStatus') },
    ...BRANCH_STATUSES.map((s) => ({
        value: s,
        label: t(`hrm.branch.status.${s}`),
    })),
]);

const queryParams = computed<BranchListParams>(() => {
    const params: BranchListParams = { page: page.value, per_page: perPage.value };
    const trimmed = searchInput.value.trim();
    if (trimmed !== '') params.search = trimmed;
    if (statusFilter.value !== null) params.status = statusFilter.value;
    return params;
});

const { data, isLoading, isError, refetch } = useBranchesQuery(queryParams);

function statusSeverity(status: BranchStatus): StatusSeverity {
    switch (status) {
        case 'active':
            return 'success';
        case 'archived':
            return 'neutral';
    }
}
function statusLabel(status: BranchStatus): string {
    return t(`hrm.branch.status.${status}`);
}

const canEdit = computed<boolean>(() => auth.can('hrm.branch.update'));
const canDelete = computed<boolean>(() => auth.can('hrm.branch.delete'));

const rowActions = computed<RowAction<BranchBrief>[]>(() => {
    const actions: RowAction<BranchBrief>[] = [
        {
            key: 'view',
            label: 'hrm.branch.list.actions.view',
            icon: 'pi pi-eye',
            onClick: (row) => navigateToDetail(row.id),
        },
    ];
    if (canEdit.value) {
        actions.push({
            key: 'edit',
            label: 'hrm.branch.list.actions.edit',
            icon: 'pi pi-pencil',
            onClick: (row) => navigateToEdit(row.id),
        });
    }
    if (canDelete.value) {
        actions.push({
            key: 'delete',
            label: 'hrm.branch.list.actions.delete',
            icon: 'pi pi-trash',
            severity: 'danger',
            onClick: (row) => onDelete(row),
        });
    }
    return actions;
});

const columns = computed<DataTableColumn<BranchBrief>[]>(() => [
    { field: 'code', label: 'hrm.branch.list.columns.code', type: 'custom', width: '160px' },
    { field: 'name', label: 'hrm.branch.list.columns.name', type: 'custom' },
    { field: 'city', label: 'hrm.branch.list.columns.city', type: 'custom' },
    { field: 'status', label: 'hrm.branch.list.columns.status', type: 'custom', align: 'center', width: '140px' },
]);

function navigateToDetail(id: number): void {
    void router.push({ name: HRM_ROUTES.BRANCH_DETAIL, params: { id } });
}
function navigateToNew(): void {
    void router.push({ name: HRM_ROUTES.BRANCH_NEW });
}
function navigateToEdit(id: number): void {
    void router.push({ name: HRM_ROUTES.BRANCH_EDIT, params: { id } });
}

function onDelete(row: BranchBrief): void {
    confirmDelete({
        message: t('hrm.branch.delete.confirmMessage', { name: row.name }),
        acceptLabel: t('hrm.branch.delete.confirmAction'),
        onAccept: async () => {
            try {
                await deleteMutation.mutateAsync(row.id);
                toast.add({
                    severity: 'success',
                    summary: t('hrm.branch.delete.toast.success'),
                    life: 3000,
                });
            } catch {
                toast.add({
                    severity: 'error',
                    summary: t('hrm.branch.delete.toast.error'),
                    life: 4000,
                });
            }
        },
    });
}

const rows = computed<BranchBrief[]>(() => data.value?.data ?? []);
const total = computed<number>(() => data.value?.meta.total ?? 0);
const hasFilters = computed<boolean>(
    () => searchInput.value.trim() !== '' || statusFilter.value !== null,
);
const canCreate = computed<boolean>(() => auth.can('hrm.branch.create'));
const errorMessage = computed<string | null>(() => (isError.value ? '' : null));

const showWelcomeEmpty = computed<boolean>(
    () => !isLoading.value && !isError.value && total.value === 0 && !hasFilters.value,
);

const tableEmptyOverride = computed(() => ({
    icon: 'pi pi-search',
    title: t('hrm.branch.list.filteredEmpty.title'),
    description: t('hrm.branch.list.filteredEmpty.description'),
}));
</script>

<template>
    <PageLayout>
        <PageHeader
            :title="t('hrm.branch.list.title')"
            :subtitle="t('hrm.branch.list.subtitle')"
        >
            <template #actions>
                <Button
                    v-if="canCreate"
                    :label="t('hrm.branch.list.newAction')"
                    icon="pi pi-plus"
                    data-testid="branch-list-new-button"
                    @click="navigateToNew"
                />
            </template>
        </PageHeader>

        <FilterBar class="mb-4 rounded-lg border border-border-default">
            <InputText
                v-model="searchInput"
                :placeholder="t('hrm.branch.list.search.placeholder')"
                :aria-label="t('hrm.branch.list.search.label')"
                class="w-72"
                data-testid="branch-list-search"
                @input="resetPage"
            />
            <Select
                v-model="statusFilter"
                :options="statusOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('hrm.branch.list.filters.status')"
                show-clear
                class="w-56"
                data-testid="branch-list-status-filter"
                @change="resetPage"
            />
        </FilterBar>

        <div
            v-if="showWelcomeEmpty"
            class="rounded-lg border border-border-default bg-surface"
            data-testid="branch-list-welcome-empty"
        >
            <EmptyState
                icon="pi pi-building"
                :title="t('hrm.branch.list.empty.title')"
                :description="t('hrm.branch.list.empty.description')"
            >
                <template v-if="canCreate" #actions>
                    <Button
                        :label="t('hrm.branch.list.empty.action')"
                        icon="pi pi-plus"
                        data-testid="branch-list-empty-create"
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
                data-testid="branch-list-table"
                @update:page="page = $event"
                @update:page-size="perPage = $event"
                @row-click="(row: BranchBrief) => navigateToDetail(row.id)"
                @retry="refetch"
            >
                <template #cell-code="{ row }">
                    <button
                        type="button"
                        class="text-brand hover:underline focus:outline-none focus:underline tabular-nums"
                        :data-testid="`branch-list-code-${row.id}`"
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
                        :data-testid="`branch-list-name-${row.id}`"
                        @click.stop="navigateToDetail(row.id)"
                    >
                        {{ row.name }}
                    </button>
                </template>

                <template #cell-city="{ row }">
                    <span
                        v-if="row.city"
                        class="block max-w-[20ch] truncate"
                        :title="row.city"
                    >
                        {{ row.city }}
                    </span>
                    <span v-else class="text-text-tertiary">—</span>
                </template>

                <template #cell-status="{ row }">
                    <StatusBadge
                        :severity="statusSeverity(row.status)"
                        :label="statusLabel(row.status)"
                        :data-testid="`branch-list-status-${row.id}`"
                    />
                </template>
            </DataTable>
        </div>
    </PageLayout>
</template>
