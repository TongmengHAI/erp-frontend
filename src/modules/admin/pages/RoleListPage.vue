<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import FilterBar from '@/shared/components/layout/FilterBar.vue';
import EmptyState from '@/shared/components/state/EmptyState.vue';
import ErrorState from '@/shared/components/state/ErrorState.vue';
import LoadingState from '@/shared/components/state/LoadingState.vue';
import PermissionDeniedPage from '@/shared/components/state/PermissionDeniedPage.vue';
import DataTable from '@/shared/components/data-table/DataTable.vue';
import StatusBadge from '@/shared/components/data-display/StatusBadge.vue';
import FilterChip from '@/shared/components/data-display/FilterChip.vue';
import type {
    DataTableColumn,
    RowAction,
} from '@/shared/components/data-table/types';

import { useAdminRolesQuery } from '@/modules/admin/composables/useAdminRoles';
import {
    ROLE_KIND_FILTERS,
    type AdminRoleBrief,
    type AdminRolesListParams,
    type RoleKindFilter,
} from '@/modules/admin/types/role';
import { ADMIN_ROUTES } from '@/modules/admin/routes';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useUrlEnumFilter } from '@/shared/composables/useUrlEnumFilter';

// ─────────────────────────────────────────────────────────────────────────────
// RoleListPage — admin role management list (Phase 2B Session 3).
//
// 5-state matrix at the PAGE level per CLAUDE.md §10.18:
//   permission-denied → loading → error → empty → populated
//
// Trust server ordering (Session 3 deliberate item #1): the backend's
// RoleController orders by `is_system DESC, name ASC` — system rows
// first, then alphabetical custom. The SPA renders rows in the order
// they arrive. No client-side sort.
//
// Both system and custom rows appear in a single list (Q4 read-side
// query: `is_system = true OR team_id = $tenant_id`). The "System"
// badge distinguishes them visually; custom rows render unbadged.
//
// Filter sources:
//   • search (text) — local ref; debounce omitted in v1 (server is fast)
//   • kind          — URL-driven via useUrlEnumFilter('kind',
//                     ROLE_KIND_FILTERS) per §10.8. Frozen allowlist
//                     rejects out-of-set values; spec at
//                     src/modules/admin/types/__tests__/role.spec.ts
//                     pins frozen-ness.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const canViewRoles = computed<boolean>(() => auth.can('roles.view'));
const canCreateRole = computed<boolean>(() => auth.can('roles.create'));

function navigateToCreate(): void {
    void router.push({ name: ADMIN_ROUTES.ROLE_CREATE });
}

function navigateToDetail(roleId: number): void {
    void router.push({
        name: ADMIN_ROUTES.ROLE_DETAIL,
        params: { id: roleId },
    });
}

// ─── Filter state ───────────────────────────────────────────────────────────
const searchInput = ref('');
const page = ref(1);
const perPage = ref(25);

const {
    value: kindFilter,
    set: setKindFilter,
    clear: clearKindFilter,
} = useUrlEnumFilter<RoleKindFilter>('kind', ROLE_KIND_FILTERS);

// Reset to page 1 on any filter change.
watch([kindFilter, searchInput], () => {
    page.value = 1;
});

const queryParams = computed<AdminRolesListParams>(() => {
    const params: AdminRolesListParams = { page: page.value, per_page: perPage.value };
    const trimmed = searchInput.value.trim();
    if (trimmed !== '') params.search = trimmed;
    if (kindFilter.value !== null) params.kind = kindFilter.value;
    return params;
});

const { data, isLoading, isError, refetch } = useAdminRolesQuery(queryParams);

const rows = computed<AdminRoleBrief[]>(() => data.value?.data ?? []);
const total = computed<number>(() => data.value?.meta.total ?? 0);

// ─── 5-state matrix derivations ─────────────────────────────────────────────
const isPermissionDenied = computed<boolean>(() => !canViewRoles.value);
const isEmpty = computed<boolean>(() => {
    if (!data.value) return false;
    return data.value.data.length === 0;
});
const hasAnyFilter = computed<boolean>(() => {
    if (searchInput.value.trim() !== '') return true;
    if (kindFilter.value !== null) return true;
    return false;
});

// ─── DataTable column config ────────────────────────────────────────────────
// Trust server ordering — sortable disabled on the kind column because
// the backend already orders system-first. Sortable on name would let
// the user reorder, which is fine, but the SPA does NOT re-sort
// client-side on its own.
const columns = computed<DataTableColumn<AdminRoleBrief>[]>(() => [
    { field: 'label', label: 'admin.roles.list.columns.label', type: 'custom' },
    { field: 'is_system', label: 'admin.roles.list.columns.kind', type: 'custom', width: '140px' },
    { field: 'users_count', label: 'admin.roles.list.columns.usersCount', type: 'custom', width: '120px', align: 'center' },
    { field: 'created_at', label: 'admin.roles.list.columns.createdAt', type: 'date', width: '160px' },
]);

const rowActions = computed<RowAction<AdminRoleBrief>[]>(() => [
    {
        key: 'view',
        label: 'admin.roles.list.actions.view',
        icon: 'pi pi-eye',
        onClick: (row) => navigateToDetail(row.id),
    },
]);

function clearAllFilters(): void {
    searchInput.value = '';
    void clearKindFilter();
    page.value = 1;
}

// ─── Filter chip ────────────────────────────────────────────────────────────
const kindChipLabel = computed<string | null>(() => {
    const v = kindFilter.value;
    if (v === null) return null;
    return t('admin.roles.list.chip.kind', {
        value: t(`admin.roles.list.filters.kind.${v}`),
    });
});

interface KindOption {
    value: RoleKindFilter;
    label: string;
}
const kindOptions = computed<KindOption[]>(() =>
    ROLE_KIND_FILTERS.map((v) => ({
        value: v,
        label: t(`admin.roles.list.filters.kind.${v}`),
    })),
);
</script>

<template>
    <PageLayout>
        <template v-if="isPermissionDenied">
            <PermissionDeniedPage
                data-testid="role-list-permission-denied"
                :resource="t('admin.roles.list.title')"
            />
        </template>

        <template v-else>
            <PageHeader
                :title="t('admin.roles.list.title')"
                :breadcrumbs="[{ label: t('admin.roles.list.breadcrumb') }]"
            >
                <template #actions>
                    <Button
                        v-if="canCreateRole"
                        :label="t('admin.roles.actions.create')"
                        icon="pi pi-plus"
                        severity="primary"
                        data-testid="role-list-create-button"
                        @click="navigateToCreate"
                    />
                </template>
            </PageHeader>

            <p class="mb-4 text-sm text-text-secondary">
                {{ t('admin.roles.list.intro') }}
            </p>

            <FilterBar>
                <InputText
                    v-model="searchInput"
                    :placeholder="t('admin.roles.list.search.placeholder')"
                    class="w-72"
                    data-testid="role-list-search-input"
                />
                <Select
                    :model-value="kindFilter"
                    :options="kindOptions"
                    option-label="label"
                    option-value="value"
                    :placeholder="t('admin.roles.list.filters.kind.all')"
                    show-clear
                    class="w-44"
                    data-testid="role-list-kind-select"
                    @update:model-value="(v) => void setKindFilter(v as RoleKindFilter | null)"
                />
            </FilterBar>

            <div
                v-if="kindChipLabel"
                class="mb-3 flex flex-wrap gap-2"
                data-testid="role-list-chips"
            >
                <FilterChip
                    :label="kindChipLabel"
                    :clear-aria-label="t('admin.roles.list.filters.kind.label')"
                    data-testid="role-list-chip-kind"
                    @clear="() => void clearKindFilter()"
                />
            </div>

            <template v-if="isLoading && !data">
                <LoadingState
                    variant="list"
                    data-testid="role-list-loading"
                />
            </template>

            <template v-else-if="isError">
                <ErrorState
                    data-testid="role-list-error"
                    :title="t('admin.roles.list.error.title')"
                    :description="t('admin.roles.list.error.description')"
                    @retry="() => void refetch()"
                />
            </template>

            <template v-else-if="isEmpty">
                <EmptyState
                    v-if="hasAnyFilter"
                    data-testid="role-list-empty-filtered"
                    :title="t('admin.roles.list.emptyFiltered.title')"
                    :description="t('admin.roles.list.emptyFiltered.description')"
                >
                    <template #action>
                        <button
                            type="button"
                            class="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
                            data-testid="role-list-empty-clear-filters"
                            @click="clearAllFilters"
                        >
                            {{ t('admin.roles.list.emptyFiltered.cta') }}
                        </button>
                    </template>
                </EmptyState>
                <EmptyState
                    v-else
                    data-testid="role-list-empty"
                    :title="t('admin.roles.list.empty.title')"
                    :description="t('admin.roles.list.empty.description')"
                >
                    <template
                        v-if="canCreateRole"
                        #action
                    >
                        <button
                            type="button"
                            class="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
                            data-testid="role-list-empty-create"
                            @click="navigateToCreate"
                        >
                            {{ t('admin.roles.actions.create') }}
                        </button>
                    </template>
                </EmptyState>
            </template>

            <template v-else-if="data">
                <DataTable
                    :data="rows"
                    :columns="columns"
                    :row-actions="rowActions"
                    mode="server"
                    :page="page"
                    :page-size="perPage"
                    :total="total"
                    data-testid="role-list-table"
                    @update:page="(p: number) => (page = p)"
                    @update:page-size="(pp: number) => (perPage = pp)"
                    @row-click="(row: AdminRoleBrief) => navigateToDetail(row.id)"
                >
                    <template #cell-label="{ row }">
                        <button
                            type="button"
                            class="text-left font-medium text-brand hover:underline"
                            :data-testid="`role-list-row-label-${row.id}`"
                            @click.stop="navigateToDetail(row.id)"
                        >
                            {{ row.label }}
                        </button>
                    </template>
                    <template #cell-is_system="{ row }">
                        <StatusBadge
                            v-if="row.is_system"
                            :label="t('admin.roles.list.kind.system')"
                            severity="info"
                            :data-testid="`role-list-row-badge-system-${row.id}`"
                        />
                        <span
                            v-else
                            class="text-xs text-text-tertiary"
                            :data-testid="`role-list-row-badge-custom-${row.id}`"
                        >
                            {{ t('admin.roles.list.kind.custom') }}
                        </span>
                    </template>
                    <template #cell-users_count="{ row }">
                        <span class="font-medium tabular-nums">{{ row.users_count }}</span>
                    </template>
                </DataTable>
            </template>
        </template>
    </PageLayout>
</template>
