<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Select from 'primevue/select';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import FilterBar from '@/shared/components/layout/FilterBar.vue';
import EmptyState from '@/shared/components/state/EmptyState.vue';
import DataTable from '@/shared/components/data-table/DataTable.vue';
import FilterChip from '@/shared/components/data-display/FilterChip.vue';
import StatusBadge, {
    type StatusSeverity,
} from '@/shared/components/data-display/StatusBadge.vue';
import type {
    DataTableColumn,
    RowAction,
} from '@/shared/components/data-table/types';
import { useTenantsQuery } from '@/modules/super-admin/composables/useTenants';
import { SUPER_ADMIN_ROUTES } from '@/modules/super-admin/routes';
import type {
    TenantBrief,
    TenantListParams,
    TenantStatus,
} from '@/modules/super-admin/types/tenant';
import { TENANT_STATUSES } from '@/modules/super-admin/types/tenant';
import { useUrlEnumFilter } from '@/shared/composables/useUrlEnumFilter';

// ─────────────────────────────────────────────────────────────────────────────
// TenantListPage — SA-side tenant list per Q7 (show-all-with-badge +
// URL-driven status filter chip). Mirrors HRM list pages in shape.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const router = useRouter();

const { value: statusFilter, set: setStatusFilter, clear: clearStatusFilter } =
    useUrlEnumFilter<TenantStatus>('status', TENANT_STATUSES);

const statusFilterModel = computed<TenantStatus | null>({
    get: () => statusFilter.value,
    set: (next) => void setStatusFilter(next),
});

const page = ref(1);
const perPage = ref(25);

watch(statusFilter, () => {
    page.value = 1;
});

interface StatusOption {
    value: TenantStatus | null;
    label: string;
}
const statusOptions = computed<StatusOption[]>(() => [
    { value: null, label: t('superAdmin.tenants.list.filters.anyStatus') },
    ...TENANT_STATUSES.map((s) => ({
        value: s,
        label: t(`superAdmin.tenants.status.${s}`),
    })),
]);

const queryParams = computed<TenantListParams>(() => {
    const params: TenantListParams = { page: page.value, per_page: perPage.value };
    if (statusFilter.value !== null) params.status = statusFilter.value;
    return params;
});

const { data, isLoading, isError, refetch } = useTenantsQuery(queryParams);

const rows = computed<TenantBrief[]>(() => data.value?.data ?? []);
const total = computed<number>(() => data.value?.meta.total ?? 0);
const errorMessage = computed<string | null>(() => (isError.value ? '' : null));

function statusSeverity(status: TenantStatus): StatusSeverity {
    switch (status) {
        case 'active':
            return 'success';
        case 'suspended':
            return 'danger';
        case 'archived':
            return 'neutral';
    }
}

function statusLabel(status: TenantStatus): string {
    return t(`superAdmin.tenants.status.${status}`);
}

function navigateToDetail(id: number): void {
    void router.push({
        name: SUPER_ADMIN_ROUTES.TENANT_DETAIL,
        params: { id },
    });
}

function navigateToEdit(id: number): void {
    void router.push({
        name: SUPER_ADMIN_ROUTES.TENANT_EDIT,
        params: { id },
    });
}

function navigateToNew(): void {
    void router.push({ name: SUPER_ADMIN_ROUTES.TENANT_NEW });
}

const rowActions = computed<RowAction<TenantBrief>[]>(() => {
    const actions: RowAction<TenantBrief>[] = [
        {
            key: 'view',
            label: 'common.view',
            icon: 'pi pi-eye',
            onClick: (row) => navigateToDetail(row.id),
        },
        {
            key: 'edit',
            label: 'common.edit',
            icon: 'pi pi-pencil',
            onClick: (row) => navigateToEdit(row.id),
        },
    ];
    return actions;
});

const columns = computed<DataTableColumn<TenantBrief>[]>(() => [
    { field: 'slug', label: 'superAdmin.tenants.list.columns.slug', type: 'custom', width: '180px' },
    { field: 'name', label: 'superAdmin.tenants.list.columns.name', type: 'custom' },
    { field: 'country_code', label: 'superAdmin.tenants.list.columns.country', type: 'custom', width: '100px', align: 'center' },
    { field: 'functional_currency', label: 'superAdmin.tenants.list.columns.currency', type: 'custom', width: '100px', align: 'center' },
    { field: 'status', label: 'superAdmin.tenants.list.columns.status', type: 'custom', width: '140px', align: 'center' },
    { field: 'created_at', label: 'superAdmin.tenants.list.columns.createdAt', type: 'date', width: '160px' },
]);

const isWelcomeEmpty = computed<boolean>(() => {
    if (isLoading.value || isError.value) return false;
    if (statusFilter.value !== null) return false;
    return rows.value.length === 0;
});
</script>

<template>
    <PageLayout>
        <PageHeader
            :title="t('superAdmin.tenants.list.title')"
            :subtitle="t('superAdmin.tenants.list.subtitle')"
        >
            <template #actions>
                <Button
                    :label="t('superAdmin.tenants.list.newAction')"
                    icon="pi pi-plus"
                    data-testid="tenant-list-new"
                    @click="navigateToNew"
                />
            </template>
        </PageHeader>

        <FilterBar>
            <Select
                v-model="statusFilterModel"
                :options="statusOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('superAdmin.tenants.list.filters.anyStatus')"
                class="w-48"
                data-testid="tenant-list-status-select"
            />
        </FilterBar>

        <FilterChip
            v-if="statusFilter !== null"
            class="mb-2"
            :label="t('superAdmin.tenants.list.statusFilterChip', {
                status: statusLabel(statusFilter),
            })"
            :clear-aria-label="t('superAdmin.tenants.list.clearStatusFilter')"
            data-testid="tenant-list-status-chip"
            @clear="() => void clearStatusFilter()"
        />

        <EmptyState
            v-if="isWelcomeEmpty"
            :title="t('superAdmin.tenants.list.empty.welcomeTitle')"
            :description="t('superAdmin.tenants.list.empty.welcomeDescription')"
            icon="pi pi-building"
            data-testid="tenant-list-welcome-empty"
        >
            <Button
                :label="t('superAdmin.tenants.list.newAction')"
                icon="pi pi-plus"
                @click="navigateToNew"
            />
        </EmptyState>

        <div v-else class="rounded-lg border border-border-default bg-surface">
            <DataTable
                :data="rows"
                :columns="columns"
                :loading="isLoading"
                :error="errorMessage"
                mode="server"
                :page="page"
                :page-size="perPage"
                :total="total"
                :row-actions="rowActions"
                data-testid="tenant-list-table"
                @update:page="page = $event"
                @update:page-size="perPage = $event"
                @row-click="(row: TenantBrief) => navigateToDetail(row.id)"
                @retry="() => void refetch()"
            >
                <template #cell-slug="{ row }">
                    <button
                        type="button"
                        class="text-brand hover:underline focus:outline-none focus:underline tabular-nums"
                        :data-testid="`tenant-list-slug-${row.id}`"
                        @click.stop="navigateToDetail(row.id)"
                    >
                        {{ row.slug }}
                    </button>
                </template>

                <template #cell-name="{ row }">
                    <button
                        type="button"
                        class="block max-w-[28ch] truncate text-left text-text-primary font-medium hover:underline focus:outline-none focus:underline"
                        :title="row.name"
                        :data-testid="`tenant-list-name-${row.id}`"
                        @click.stop="navigateToDetail(row.id)"
                    >
                        {{ row.name }}
                    </button>
                </template>

                <template #cell-country_code="{ row }">
                    {{ row.country_code }}
                </template>

                <template #cell-functional_currency="{ row }">
                    {{ row.functional_currency }}
                </template>

                <template #cell-status="{ row }">
                    <StatusBadge
                        :label="statusLabel(row.status)"
                        :severity="statusSeverity(row.status)"
                    />
                </template>
            </DataTable>
        </div>
    </PageLayout>
</template>
