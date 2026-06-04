import ToastService from 'primevue/toastservice';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import type { RouteRecordRaw } from 'vue-router';

// Stub the super-admin routes the dashboard's RouterLinks point to.
// Without these, RouterLink's setup() throws "No match for ..." during
// render and the populated state never paints.
const SA_TEST_ROUTES: RouteRecordRaw[] = [
    { path: '/', name: 'home', component: { template: '<div />' } },
    { path: '/apps', name: 'launcher', component: { template: '<div />' } },
    {
        path: '/super-admin/tenants',
        name: 'super-admin.tenants.list',
        component: { template: '<div />' },
    },
    {
        path: '/super-admin/tenants/new',
        name: 'super-admin.tenants.create',
        component: { template: '<div />' },
    },
    {
        path: '/super-admin/tenants/:id',
        name: 'super-admin.tenants.detail',
        component: { template: '<div />' },
    },
];

import SuperAdminDashboardPage from '@/modules/super-admin/pages/SuperAdminDashboardPage.vue';
import * as dashboardApi from '@/modules/super-admin/api/dashboard';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// Per-test QueryClient with retries disabled — TanStack v5 retries
// failed queries 3 times by default, which would make the error state
// take seconds to settle and any test wait flaky. Fresh QueryClient
// per test prevents the dashboard query result from leaking between
// tests.
function freshVueQueryPlugin() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return [VueQueryPlugin, { queryClient: client }] as const;
}

// ─────────────────────────────────────────────────────────────────────────────
// SuperAdminDashboardPage — Session 7 plan tightening #2.
// 5-state matrix applied at the PAGE level:
//
//   1. permission-denied (auth.isSuperAdmin = false)
//   2. loading           (query pending)
//   3. error             (query failed)
//   4. empty             (zero tenants in the estate)
//   5. populated         (5 tiles + 2 lists rendered)
// ─────────────────────────────────────────────────────────────────────────────

function seedSa(): void {
    const auth = useAuthStore();
    auth.$patch({
        user: {
            id: 99,
            name: 'Vendor Ops',
            email: 'ops@myerp.local',
            email_verified_at: null,
            type: 'super_admin',
            is_super_admin: true,
        },
    });
}

function seedNonSa(): void {
    const auth = useAuthStore();
    auth.$patch({
        user: {
            id: 1,
            name: 'Tenant Admin',
            email: 'admin@acme.test',
            email_verified_at: null,
            type: 'tenant_user',
            is_super_admin: false,
        },
    });
}

const POPULATED_RESPONSE = {
    data: {
        tenant_status_counts: {
            total: 12,
            active: 10,
            suspended: 2,
            archived: 0,
        },
        tenants_by_module: [
            { module_key: 'hrm', active_count: 10, disabled_count: 2 },
        ],
        recent_signups: [
            {
                id: 5,
                slug: 'sokha',
                name: 'Sokha Trading Co.',
                country_code: 'KH',
                default_currency: 'USD',
                functional_currency: 'USD',
                timezone: 'Asia/Phnom_Penh',
                status: 'active' as const,
                created_at: '2026-06-04T00:00:00+00:00',
            },
        ],
        recent_suspensions: [
            {
                id: 9,
                slug: 'old-co',
                name: 'Old Co.',
                country_code: 'KH',
                default_currency: 'USD',
                functional_currency: 'USD',
                timezone: 'Asia/Phnom_Penh',
                status: 'suspended' as const,
                created_at: '2026-05-30T00:00:00+00:00',
            },
        ],
        window_days: 7,
    },
};

const EMPTY_RESPONSE = {
    data: {
        tenant_status_counts: { total: 0, active: 0, suspended: 0, archived: 0 },
        tenants_by_module: [],
        recent_signups: [],
        recent_suspensions: [],
        window_days: 7,
    },
};

describe('SuperAdminDashboardPage — 5-state matrix', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('state 1 (permission-denied): renders PermissionDeniedPage when auth.isSuperAdmin is false', async () => {
        // Mock the API so the query has something to return even if it
        // fires (the page template short-circuits via v-if so the data
        // is never displayed; this is defence-in-depth for non-SA
        // who somehow reached the route).
        vi.spyOn(dashboardApi, 'getDashboard').mockImplementation(
            () => new Promise(() => undefined),
        );

        const w = await mountWithGlobals(SuperAdminDashboardPage, {
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: SA_TEST_ROUTES,
        });
        seedNonSa();
        await w.vm.$nextTick();

        expect(w.find('[data-testid="dashboard-permission-denied"]').exists()).toBe(true);
        // Tiles + dashboard body are NOT rendered — the v-if hides
        // everything below the PermissionDeniedPage.
        expect(w.find('[data-testid="dashboard-tiles"]').exists()).toBe(false);
        expect(w.find('[data-testid="dashboard-loading"]').exists()).toBe(false);
    });

    it('state 2 (loading): renders the loading skeleton while the query is in-flight', async () => {
        // Mock that never resolves — query stays in `loading` state.
        vi.spyOn(dashboardApi, 'getDashboard').mockImplementation(
            () => new Promise(() => undefined),
        );

        const w = await mountWithGlobals(SuperAdminDashboardPage, {
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: SA_TEST_ROUTES,
        });
        seedSa();
        await w.vm.$nextTick();

        expect(w.find('[data-testid="dashboard-loading"]').exists()).toBe(true);
        // Tiles + empty + error all hidden during loading.
        expect(w.find('[data-testid="dashboard-tiles"]').exists()).toBe(false);
        expect(w.find('[data-testid="dashboard-empty"]').exists()).toBe(false);
        expect(w.find('[data-testid="dashboard-error"]').exists()).toBe(false);
    });

    it('state 3 (error): renders ErrorState when the query fails', async () => {
        vi.spyOn(dashboardApi, 'getDashboard').mockRejectedValue(new Error('500'));

        const w = await mountWithGlobals(SuperAdminDashboardPage, {
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: SA_TEST_ROUTES,
        });
        seedSa();

        // Wait for query to settle into error state.
        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="dashboard-error"]').exists()).toBe(true);
        expect(w.find('[data-testid="dashboard-tiles"]').exists()).toBe(false);
    });

    it('state 4 (empty): renders the empty state when total tenants is 0', async () => {
        vi.spyOn(dashboardApi, 'getDashboard').mockResolvedValue(EMPTY_RESPONSE);

        const w = await mountWithGlobals(SuperAdminDashboardPage, {
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: SA_TEST_ROUTES,
        });
        seedSa();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="dashboard-empty"]').exists()).toBe(true);
        // Tiles NOT rendered in empty state — would show "0" cards, UI
        // noise.
        expect(w.find('[data-testid="dashboard-tiles"]').exists()).toBe(false);
    });

    it('state 5 (populated): renders all 3 tiles + 2 lists with real data', async () => {
        vi.spyOn(dashboardApi, 'getDashboard').mockResolvedValue(POPULATED_RESPONSE);

        const w = await mountWithGlobals(SuperAdminDashboardPage, {
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: SA_TEST_ROUTES,
        });
        seedSa();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        // 3 tiles in the metrics row.
        expect(w.find('[data-testid="tile-tenant-status-counts"]').exists()).toBe(true);
        expect(w.find('[data-testid="tile-active-tenants"]').exists()).toBe(true);
        expect(w.find('[data-testid="tile-tenants-by-module"]').exists()).toBe(true);

        // 2 recent-activity lists.
        expect(w.find('[data-testid="list-recent-signups"]').exists()).toBe(true);
        expect(w.find('[data-testid="list-recent-suspensions"]').exists()).toBe(true);

        // Tile values surface the right counts.
        expect(w.find('[data-testid="tile-total-value"]').text()).toBe('12');
        expect(w.find('[data-testid="tile-active-value"]').text()).toBe('10');

        // Empty + loading + error all gone.
        expect(w.find('[data-testid="dashboard-empty"]').exists()).toBe(false);
        expect(w.find('[data-testid="dashboard-loading"]').exists()).toBe(false);
        expect(w.find('[data-testid="dashboard-error"]').exists()).toBe(false);
    });
});
