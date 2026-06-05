<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
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
import StatusBadge, {
    type StatusSeverity,
} from '@/shared/components/data-display/StatusBadge.vue';
import FilterChip from '@/shared/components/data-display/FilterChip.vue';
import type {
    DataTableColumn,
    RowAction,
} from '@/shared/components/data-table/types';

import { useAdminUsersQuery } from '@/modules/admin/composables/useAdminUsers';
import {
    USER_LIFECYCLE_FILTERS,
    type AdminUserBrief,
    type AdminUsersListParams,
    type UserLifecycleFilter,
} from '@/modules/admin/types/user';
import { ADMIN_ROUTES } from '@/modules/admin/routes';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useUrlEnumFilter } from '@/shared/composables/useUrlEnumFilter';

// ─────────────────────────────────────────────────────────────────────────────
// UserListPage — admin user management list (Phase 2A Session 3).
//
// 5-state matrix at the PAGE level per CLAUDE.md §10.18 — the page owns
// the state, every tile inside the populated branch routes through it.
// Per-tile state matrices on a composite page would produce a UI
// checkerboard. Permission-denied precedes data-fetch in render order
// so a non-admin briefly seeing half-rendered admin chrome is structurally
// impossible.
//
// Filter sources:
//   • search (text)  — local ref; debounce omitted in v1 (server is fast)
//   • lifecycle      — URL-driven via useUrlEnumFilter('lifecycle',
//                      USER_LIFECYCLE_FILTERS) per §10.8. The frozen
//                      allowlist rejects out-of-set values via the
//                      composable layer; the spec at
//                      src/modules/admin/types/__tests__/user.spec.ts
//                      pins frozen-ness.
//   • role_id        — local ref (role-picker UI ships in Session 4
//                      alongside the edit form). Reserved here.
//
// 'deactivated' is a SUPERSET of soft-deleted users; the wire translation
// is `include_deactivated=true` + (status undefined). 'active' /
// 'inactive' are real UserStatus enum values; the wire translation is
// status=<value> + include_deactivated=false (default).
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

// ─── STATE 1: permission-denied (page-level, precedes data-fetch) ──────────
const canViewUsers = computed<boolean>(() => auth.can('users.view'));

// ─── Filter state ───────────────────────────────────────────────────────────
const searchInput = ref('');
const page = ref(1);
const perPage = ref(25);

const {
    value: lifecycleFilter,
    set: setLifecycleFilter,
    clear: clearLifecycleFilter,
} = useUrlEnumFilter<UserLifecycleFilter>('lifecycle', USER_LIFECYCLE_FILTERS);

// Reset to page 1 on any filter change — staying on page N with a
// filter that narrows results to less than N pages leaves the user
// on an empty page.
watch([lifecycleFilter, searchInput], () => {
    page.value = 1;
});

// ─── Wire-shape translation ─────────────────────────────────────────────────
// The lifecycle filter is a UI-only superset of the backend's status
// + include_deactivated. Translate at the wire boundary; the rest of
// the page treats the filter as a single value.
const queryParams = computed<AdminUsersListParams>(() => {
    const params: AdminUsersListParams = { page: page.value, per_page: perPage.value };
    const trimmed = searchInput.value.trim();
    if (trimmed !== '') params.search = trimmed;

    const lifecycle = lifecycleFilter.value;
    if (lifecycle === 'deactivated') {
        params.include_deactivated = true;
    } else if (lifecycle === 'active' || lifecycle === 'inactive') {
        params.status = lifecycle;
    }
    return params;
});

const { data, isLoading, isError, refetch } = useAdminUsersQuery(queryParams);

// Extracted typed projection so DataTable's `generic T extends
// Record<string, unknown>` infers AdminUserBrief from the data prop,
// keeping columns + rowActions strictly typed.
const rows = computed<AdminUserBrief[]>(() => data.value?.data ?? []);
const total = computed<number>(() => data.value?.meta.total ?? 0);

// ─── 5-state matrix derivations ─────────────────────────────────────────────
// Order matters — permission-denied takes precedence, then loading,
// then error, then empty-vs-populated. All five reduce to a single
// branch in the template.
const isPermissionDenied = computed<boolean>(() => !canViewUsers.value);
const isEmpty = computed<boolean>(() => {
    if (!data.value) return false;
    return data.value.data.length === 0;
});
const hasAnyFilter = computed<boolean>(() => {
    if (searchInput.value.trim() !== '') return true;
    if (lifecycleFilter.value !== null) return true;
    return false;
});

// ─── Status badge ───────────────────────────────────────────────────────────
function statusSeverity(row: AdminUserBrief): StatusSeverity {
    if (row.is_deactivated) return 'neutral';
    return row.status === 'active' ? 'success' : 'warning';
}

function statusLabel(row: AdminUserBrief): string {
    if (row.is_deactivated) return t('admin.users.status.deactivated');
    return t(`admin.users.status.${row.status}`);
}

// ─── DataTable column config ────────────────────────────────────────────────
const columns = computed<DataTableColumn<AdminUserBrief>[]>(() => [
    { field: 'name', label: 'admin.users.list.columns.name', type: 'custom' },
    { field: 'email', label: 'admin.users.list.columns.email', type: 'custom' },
    { field: 'role_name', label: 'admin.users.list.columns.role', type: 'custom', width: '180px' },
    { field: 'status', label: 'admin.users.list.columns.status', type: 'custom', width: '140px', align: 'center' },
    { field: 'created_at', label: 'admin.users.list.columns.createdAt', type: 'date', width: '160px' },
]);

const rowActions = computed<RowAction<AdminUserBrief>[]>(() => [
    {
        key: 'view',
        label: 'admin.users.list.actions.view',
        icon: 'pi pi-eye',
        onClick: (row) => navigateToDetail(row.id),
    },
]);

function navigateToDetail(userId: number): void {
    void router.push({
        name: ADMIN_ROUTES.USER_DETAIL,
        params: { id: userId },
    });
}

function clearAllFilters(): void {
    searchInput.value = '';
    void clearLifecycleFilter();
    page.value = 1;
}

// ─── Filter chip ────────────────────────────────────────────────────────────
const lifecycleChipLabel = computed<string | null>(() => {
    const v = lifecycleFilter.value;
    if (v === null) return null;
    return t('admin.users.list.chip.lifecycle', {
        value: t(`admin.users.list.filters.lifecycle.${v}`),
    });
});

interface LifecycleOption {
    value: UserLifecycleFilter | null;
    label: string;
}
const lifecycleOptions = computed<LifecycleOption[]>(() => [
    { value: null, label: t('admin.users.list.filters.lifecycle.all') },
    ...USER_LIFECYCLE_FILTERS.map((v) => ({
        value: v,
        label: t(`admin.users.list.filters.lifecycle.${v}`),
    })),
]);
</script>

<template>
    <PageLayout>
        <!--
            STATE 1: permission-denied (precedes data-fetch in render order).
            Non-admin reaching the route via direct nav sees this page only;
            the v-if structure makes half-rendered admin chrome structurally
            impossible per §10.18 gotcha.
        -->
        <template v-if="isPermissionDenied">
            <PermissionDeniedPage
                data-testid="user-list-permission-denied"
                :resource="t('admin.users.list.title')"
            />
        </template>

        <template v-else>
            <PageHeader
                :title="t('admin.users.list.title')"
                :breadcrumbs="[{ label: t('admin.users.list.breadcrumb') }]"
            />

            <p class="mb-4 text-sm text-text-secondary">
                {{ t('admin.users.list.intro') }}
            </p>

            <FilterBar>
                <InputText
                    v-model="searchInput"
                    :placeholder="t('admin.users.list.search.placeholder')"
                    class="w-72"
                    data-testid="user-list-search-input"
                />
                <Select
                    :model-value="lifecycleFilter"
                    :options="lifecycleOptions"
                    option-label="label"
                    option-value="value"
                    class="w-44"
                    data-testid="user-list-lifecycle-select"
                    @update:model-value="(v) => void setLifecycleFilter(v as UserLifecycleFilter | null)"
                />
            </FilterBar>

            <div
                v-if="lifecycleChipLabel"
                class="mb-3 flex flex-wrap gap-2"
                data-testid="user-list-chips"
            >
                <FilterChip
                    :label="lifecycleChipLabel"
                    :clear-aria-label="t('admin.users.list.filters.lifecycle.label')"
                    data-testid="user-list-chip-lifecycle"
                    @clear="() => void clearLifecycleFilter()"
                />
            </div>

            <!-- STATE 2: loading (initial fetch only — TanStack handles refetch silently) -->
            <template v-if="isLoading && !data">
                <LoadingState
                    variant="list"
                    data-testid="user-list-loading"
                />
            </template>

            <!-- STATE 3: error -->
            <template v-else-if="isError">
                <ErrorState
                    data-testid="user-list-error"
                    :title="t('admin.users.list.error.title')"
                    :description="t('admin.users.list.error.description')"
                    @retry="() => void refetch()"
                />
            </template>

            <!-- STATE 4: empty -->
            <template v-else-if="isEmpty">
                <!-- Empty-because-filtered vs empty-by-nature: different copy + CTA -->
                <EmptyState
                    v-if="hasAnyFilter"
                    data-testid="user-list-empty-filtered"
                    :title="t('admin.users.list.emptyFiltered.title')"
                    :description="t('admin.users.list.emptyFiltered.description')"
                >
                    <template #action>
                        <button
                            type="button"
                            class="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
                            data-testid="user-list-empty-clear-filters"
                            @click="clearAllFilters"
                        >
                            {{ t('admin.users.list.emptyFiltered.cta') }}
                        </button>
                    </template>
                </EmptyState>
                <EmptyState
                    v-else
                    data-testid="user-list-empty"
                    :title="t('admin.users.list.empty.title')"
                    :description="t('admin.users.list.empty.description')"
                />
            </template>

            <!-- STATE 5: populated -->
            <template v-else-if="data">
                <DataTable
                    :data="rows"
                    :columns="columns"
                    :row-actions="rowActions"
                    mode="server"
                    :page="page"
                    :page-size="perPage"
                    :total="total"
                    data-testid="user-list-table"
                    @update:page="(p: number) => (page = p)"
                    @update:page-size="(pp: number) => (perPage = pp)"
                    @row-click="(row: AdminUserBrief) => navigateToDetail(row.id)"
                >
                    <template #cell-name="{ row }">
                        <button
                            type="button"
                            class="text-left font-medium text-brand hover:underline"
                            :data-testid="`user-list-row-name-${row.id}`"
                            @click.stop="navigateToDetail(row.id)"
                        >
                            {{ row.name }}
                        </button>
                    </template>
                    <template #cell-email="{ row }">
                        <span class="text-text-secondary">{{ row.email }}</span>
                    </template>
                    <template #cell-role_name="{ row }">
                        <span v-if="row.role_name">{{ row.role_name }}</span>
                        <span v-else class="text-text-tertiary">—</span>
                    </template>
                    <template #cell-status="{ row }">
                        <StatusBadge
                            :label="statusLabel(row)"
                            :severity="statusSeverity(row)"
                        />
                    </template>
                </DataTable>
            </template>
        </template>
    </PageLayout>
</template>
