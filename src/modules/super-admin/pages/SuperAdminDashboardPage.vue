<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import LoadingState from '@/shared/components/state/LoadingState.vue';
import ErrorState from '@/shared/components/state/ErrorState.vue';
import EmptyState from '@/shared/components/state/EmptyState.vue';
import PermissionDeniedPage from '@/shared/components/state/PermissionDeniedPage.vue';
import TenantStatusTile from '@/modules/super-admin/components/tiles/TenantStatusTile.vue';
import ActiveTenantsTile from '@/modules/super-admin/components/tiles/ActiveTenantsTile.vue';
import TenantsByModuleTile from '@/modules/super-admin/components/tiles/TenantsByModuleTile.vue';
import RecentTenantsList from '@/modules/super-admin/components/lists/RecentTenantsList.vue';
import { useDashboardQuery } from '@/modules/super-admin/composables/useDashboard';
import { SUPER_ADMIN_ROUTES } from '@/modules/super-admin/routes';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// SuperAdminDashboardPage — replaces the Session 5 placeholder with
// the real 5-tile + 2-list view consuming
// /api/v1/super-admin/dashboard (backend Session 4).
//
// 5-state matrix applied at the PAGE level (per Session 7 plan
// tightening #2):
//   1. permission-denied   — auth.isSuperAdmin === false; theoretically
//                             unreachable (route guard rejects non-SA
//                             with 404), but defensive self-protection.
//   2. loading              — query in-flight; skeleton tiles.
//   3. error                — query failed; ErrorState with retry.
//   4. empty                — query succeeded but zero tenants exist;
//                             friendly "no tenants yet" empty state with
//                             a "Create the first tenant" call to action.
//   5. populated            — render the 5 tiles + 2 lists.
//
// Each tile is its own component (TenantStatusTile, ActiveTenantsTile,
// TenantsByModuleTile, RecentTenantsList × 2 variants) so a future
// re-layout (e.g. moving signups to a sidebar) is a template-only
// change with no logic spread across components.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const { data, isLoading, isError, refetch } = useDashboardQuery();

const dashboardData = computed(() => data.value?.data);

const isEmpty = computed<boolean>(() => {
    if (isLoading.value || isError.value || !dashboardData.value) return false;
    return dashboardData.value.tenant_status_counts.total === 0;
});

function onCreateTenant(): void {
    void router.push({ name: SUPER_ADMIN_ROUTES.TENANT_NEW });
}

function onViewAllTenants(): void {
    void router.push({ name: SUPER_ADMIN_ROUTES.TENANT_LIST });
}

function onRetry(): void {
    void refetch();
}
</script>

<template>
    <PageLayout>
        <!-- State 1: permission-denied. Self-protective check; the
             route guard normally catches this. -->
        <PermissionDeniedPage
            v-if="!auth.isSuperAdmin"
            data-testid="dashboard-permission-denied"
        />

        <template v-else>
            <PageHeader
                :title="t('superAdmin.dashboard.title')"
                :subtitle="t('superAdmin.dashboard.subtitle')"
            >
                <template #actions>
                    <Button
                        :label="t('superAdmin.dashboard.actions.viewAll')"
                        icon="pi pi-list"
                        severity="secondary"
                        data-testid="dashboard-view-all-tenants"
                        @click="onViewAllTenants"
                    />
                    <Button
                        :label="t('superAdmin.dashboard.actions.newTenant')"
                        icon="pi pi-plus"
                        data-testid="dashboard-new-tenant"
                        @click="onCreateTenant"
                    />
                </template>
            </PageHeader>

            <!-- State 2: loading -->
            <LoadingState
                v-if="isLoading"
                variant="detail"
                data-testid="dashboard-loading"
            />

            <!-- State 3: error -->
            <ErrorState
                v-else-if="isError"
                data-testid="dashboard-error"
                @retry="onRetry"
            />

            <!-- State 4: empty (zero tenants in the estate) -->
            <EmptyState
                v-else-if="isEmpty"
                :title="t('superAdmin.dashboard.empty.title')"
                :description="t('superAdmin.dashboard.empty.description')"
                icon="pi pi-building"
                data-testid="dashboard-empty"
            >
                <Button
                    :label="t('superAdmin.dashboard.actions.newTenant')"
                    icon="pi pi-plus"
                    @click="onCreateTenant"
                />
            </EmptyState>

            <!-- State 5: populated -->
            <template v-else-if="dashboardData">
                <div
                    class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
                    data-testid="dashboard-tiles"
                >
                    <TenantStatusTile :counts="dashboardData.tenant_status_counts" />
                    <ActiveTenantsTile :count="dashboardData.tenant_status_counts.active" />
                    <TenantsByModuleTile :rows="dashboardData.tenants_by_module" />
                </div>

                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <RecentTenantsList
                        :tenants="dashboardData.recent_signups"
                        :window-days="dashboardData.window_days"
                        variant="signups"
                    />
                    <RecentTenantsList
                        :tenants="dashboardData.recent_suspensions"
                        :window-days="dashboardData.window_days"
                        variant="suspensions"
                    />
                </div>
            </template>
        </template>
    </PageLayout>
</template>
