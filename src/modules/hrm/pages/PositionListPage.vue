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
    useDeletePosition,
    usePositionsQuery,
} from '@/modules/hrm/composables/usePositions';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type {
    PositionBrief,
    PositionListParams,
    PositionStatus,
} from '@/modules/hrm/types/position';
import { POSITION_STATUSES } from '@/modules/hrm/types/position';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';

// ─────────────────────────────────────────────────────────────────────────────
// PositionListPage — direct transposition of DepartmentListPage.
// Same DataTable wiring, same status badge mapping, same row-actions
// kebab, same welcome-empty / filtered-empty split, same truncation
// guards. Three columns (code, title, status); status enum has two
// values (active / archived) just like Department.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const { confirmDelete } = useAppConfirm();
const deleteMutation = useDeletePosition();

// ─── Filter state ───────────────────────────────────────────────────────────
const searchInput = ref('');
const statusFilter = ref<PositionStatus | null>(null);
const page = ref(1);
const perPage = ref(25);

function resetPage(): void {
    page.value = 1;
}

interface StatusOption {
    value: PositionStatus | null;
    label: string;
}
const statusOptions = computed<StatusOption[]>(() => [
    { value: null, label: t('hrm.position.list.filters.anyStatus') },
    ...POSITION_STATUSES.map((s) => ({
        value: s,
        label: t(`hrm.position.status.${s}`),
    })),
]);

const queryParams = computed<PositionListParams>(() => {
    const params: PositionListParams = { page: page.value, per_page: perPage.value };
    const trimmed = searchInput.value.trim();
    if (trimmed !== '') params.search = trimmed;
    if (statusFilter.value !== null) params.status = statusFilter.value;
    return params;
});

const { data, isLoading, isError, refetch } = usePositionsQuery(queryParams);

function statusSeverity(status: PositionStatus): StatusSeverity {
    switch (status) {
        case 'active':
            return 'success';
        case 'archived':
            return 'neutral';
    }
}
function statusLabel(status: PositionStatus): string {
    return t(`hrm.position.status.${status}`);
}

const canEdit = computed<boolean>(() => auth.can('hrm.position.update'));
const canDelete = computed<boolean>(() => auth.can('hrm.position.delete'));

const rowActions = computed<RowAction<PositionBrief>[]>(() => {
    const actions: RowAction<PositionBrief>[] = [
        {
            key: 'view',
            label: 'hrm.position.list.actions.view',
            icon: 'pi pi-eye',
            onClick: (row) => navigateToDetail(row.id),
        },
    ];
    if (canEdit.value) {
        actions.push({
            key: 'edit',
            label: 'hrm.position.list.actions.edit',
            icon: 'pi pi-pencil',
            onClick: (row) => navigateToEdit(row.id),
        });
    }
    if (canDelete.value) {
        actions.push({
            key: 'delete',
            label: 'hrm.position.list.actions.delete',
            icon: 'pi pi-trash',
            severity: 'danger',
            onClick: (row) => onDelete(row),
        });
    }
    return actions;
});

const columns = computed<DataTableColumn<PositionBrief>[]>(() => [
    { field: 'code', label: 'hrm.position.list.columns.code', type: 'custom', width: '160px' },
    { field: 'title', label: 'hrm.position.list.columns.title', type: 'custom' },
    { field: 'status', label: 'hrm.position.list.columns.status', type: 'custom', align: 'center', width: '140px' },
]);

function navigateToDetail(id: number): void {
    void router.push({ name: HRM_ROUTES.POSITION_DETAIL, params: { id } });
}
function navigateToNew(): void {
    void router.push({ name: HRM_ROUTES.POSITION_NEW });
}
function navigateToEdit(id: number): void {
    void router.push({ name: HRM_ROUTES.POSITION_EDIT, params: { id } });
}

function onDelete(row: PositionBrief): void {
    confirmDelete({
        message: t('hrm.position.delete.confirmMessage', { title: row.title }),
        acceptLabel: t('hrm.position.delete.confirmAction'),
        onAccept: async () => {
            try {
                await deleteMutation.mutateAsync(row.id);
                toast.add({
                    severity: 'success',
                    summary: t('hrm.position.delete.toast.success'),
                    life: 3000,
                });
            } catch {
                toast.add({
                    severity: 'error',
                    summary: t('hrm.position.delete.toast.error'),
                    life: 4000,
                });
            }
        },
    });
}

const rows = computed<PositionBrief[]>(() => data.value?.data ?? []);
const total = computed<number>(() => data.value?.meta.total ?? 0);
const hasFilters = computed<boolean>(
    () => searchInput.value.trim() !== '' || statusFilter.value !== null,
);
const canCreate = computed<boolean>(() => auth.can('hrm.position.create'));
const errorMessage = computed<string | null>(() => (isError.value ? '' : null));

const showWelcomeEmpty = computed<boolean>(
    () => !isLoading.value && !isError.value && total.value === 0 && !hasFilters.value,
);

const tableEmptyOverride = computed(() => ({
    icon: 'pi pi-search',
    title: t('hrm.position.list.filteredEmpty.title'),
    description: t('hrm.position.list.filteredEmpty.description'),
}));
</script>

<template>
    <PageLayout>
        <PageHeader
            :title="t('hrm.position.list.title')"
            :subtitle="t('hrm.position.list.subtitle')"
        >
            <template #actions>
                <Button
                    v-if="canCreate"
                    :label="t('hrm.position.list.newAction')"
                    icon="pi pi-plus"
                    data-testid="position-list-new-button"
                    @click="navigateToNew"
                />
            </template>
        </PageHeader>

        <FilterBar class="mb-4 rounded-lg border border-border-default">
            <InputText
                v-model="searchInput"
                :placeholder="t('hrm.position.list.search.placeholder')"
                :aria-label="t('hrm.position.list.search.label')"
                class="w-72"
                data-testid="position-list-search"
                @input="resetPage"
            />
            <Select
                v-model="statusFilter"
                :options="statusOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('hrm.position.list.filters.status')"
                show-clear
                class="w-56"
                data-testid="position-list-status-filter"
                @change="resetPage"
            />
        </FilterBar>

        <div
            v-if="showWelcomeEmpty"
            class="rounded-lg border border-border-default bg-surface"
            data-testid="position-list-welcome-empty"
        >
            <EmptyState
                icon="pi pi-briefcase"
                :title="t('hrm.position.list.empty.title')"
                :description="t('hrm.position.list.empty.description')"
            >
                <template v-if="canCreate" #actions>
                    <Button
                        :label="t('hrm.position.list.empty.action')"
                        icon="pi pi-plus"
                        data-testid="position-list-empty-create"
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
                data-testid="position-list-table"
                @update:page="page = $event"
                @update:page-size="perPage = $event"
                @row-click="(row: PositionBrief) => navigateToDetail(row.id)"
                @retry="refetch"
            >
                <template #cell-code="{ row }">
                    <button
                        type="button"
                        class="text-brand hover:underline focus:outline-none focus:underline tabular-nums"
                        :data-testid="`position-list-code-${row.id}`"
                        @click.stop="navigateToDetail(row.id)"
                    >
                        {{ row.code }}
                    </button>
                </template>

                <template #cell-title="{ row }">
                    <button
                        type="button"
                        class="block max-w-[28ch] truncate text-left text-text-primary font-medium hover:underline focus:outline-none focus:underline"
                        :title="row.title"
                        :data-testid="`position-list-title-${row.id}`"
                        @click.stop="navigateToDetail(row.id)"
                    >
                        {{ row.title }}
                    </button>
                </template>

                <template #cell-status="{ row }">
                    <StatusBadge
                        :severity="statusSeverity(row.status)"
                        :label="statusLabel(row.status)"
                        :data-testid="`position-list-status-${row.id}`"
                    />
                </template>
            </DataTable>
        </div>
    </PageLayout>
</template>
