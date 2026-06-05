import ToastService from 'primevue/toastservice';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import type { RouteRecordRaw } from 'vue-router';

import UserListPage from '@/modules/admin/pages/UserListPage.vue';
import * as adminUsersApi from '@/modules/admin/api/users';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// UserListPage — 5-state matrix spec per CLAUDE.md §10.18.
//
// One test per state; the populated test also asserts the cross-tenant
// list contract (admin in tenant A sees only their tenant's users — the
// backend enforces this; the SPA trusts the backend filter and the
// list renders whatever rows come back).
//
// Per-test QueryClient with retries disabled — TanStack v5's default
// retry cascade would make the error-state test wait seconds before
// transitioning. Same pattern as the SA dashboard spec.
// ─────────────────────────────────────────────────────────────────────────────

function freshVueQueryPlugin() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return [VueQueryPlugin, { queryClient: client }] as const;
}

const ADMIN_TEST_ROUTES: RouteRecordRaw[] = [
    { path: '/', name: 'home', component: { template: '<div />' } },
    { path: '/apps', name: 'launcher', component: { template: '<div />' } },
    {
        path: '/admin/users',
        name: 'admin.users.list',
        component: { template: '<div />' },
    },
    {
        path: '/admin/users/:id',
        name: 'admin.users.detail',
        component: { template: '<div />' },
    },
];

function seedAdminUser(): void {
    const auth = useAuthStore();
    auth.$patch({
        user: {
            id: 1,
            name: 'Tenant Admin',
            email: 'admin@example.com',
            email_verified_at: null,
            type: 'tenant_user',
            is_super_admin: false,
        },
        permissions: ['users.view'],
    });
}

function seedNonAdminUser(): void {
    const auth = useAuthStore();
    auth.$patch({
        user: {
            id: 2,
            name: 'No-perm User',
            email: 'viewer@example.com',
            email_verified_at: null,
            type: 'tenant_user',
            is_super_admin: false,
        },
        permissions: [],
    });
}

const POPULATED_RESPONSE = {
    data: [
        {
            id: 10,
            name: 'Alice in Tenant A',
            email: 'alice@example.com',
            status: 'active' as const,
            is_active: true,
            is_deactivated: false,
            role_name: 'tenant_admin',
            created_at: '2026-06-01T00:00:00+00:00',
        },
        {
            id: 11,
            name: 'Bob in Tenant A',
            email: 'bob@example.com',
            status: 'inactive' as const,
            is_active: false,
            is_deactivated: false,
            role_name: 'viewer',
            created_at: '2026-06-02T00:00:00+00:00',
        },
    ],
    meta: { current_page: 1, last_page: 1, per_page: 25, total: 2, from: 1, to: 2 },
    links: { first: null, last: null, prev: null, next: null },
};

const EMPTY_RESPONSE = {
    data: [],
    meta: { current_page: 1, last_page: 1, per_page: 25, total: 0, from: null, to: null },
    links: { first: null, last: null, prev: null, next: null },
};

describe('UserListPage — 5-state matrix', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('STATE 1 (permission-denied): renders PermissionDeniedPage when user lacks users.view', async () => {
        // Mock the API so the query has something to return even if the
        // observer somehow fires. The page's v-if branch hides the data
        // surface; this is defence-in-depth for non-admin who reached
        // the route via direct nav.
        vi.spyOn(adminUsersApi, 'listAdminUsers').mockImplementation(
            () => new Promise(() => undefined),
        );

        const w = await mountWithGlobals(UserListPage, {
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
        });
        seedNonAdminUser();
        await w.vm.$nextTick();

        expect(w.find('[data-testid="user-list-permission-denied"]').exists()).toBe(true);
        // Data surface is hidden — table, filters, chips all gone.
        expect(w.find('[data-testid="user-list-table"]').exists()).toBe(false);
        expect(w.find('[data-testid="user-list-loading"]').exists()).toBe(false);
        expect(w.find('[data-testid="user-list-search-input"]').exists()).toBe(false);
    });

    it('STATE 2 (loading): renders LoadingState while the query is in-flight', async () => {
        // Never-resolving promise keeps the query in loading state.
        vi.spyOn(adminUsersApi, 'listAdminUsers').mockImplementation(
            () => new Promise(() => undefined),
        );

        const w = await mountWithGlobals(UserListPage, {
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
        });
        seedAdminUser();
        await w.vm.$nextTick();

        expect(w.find('[data-testid="user-list-loading"]').exists()).toBe(true);
        expect(w.find('[data-testid="user-list-table"]').exists()).toBe(false);
        expect(w.find('[data-testid="user-list-empty"]').exists()).toBe(false);
        expect(w.find('[data-testid="user-list-error"]').exists()).toBe(false);
    });

    it('STATE 3 (error): renders ErrorState when the query rejects', async () => {
        vi.spyOn(adminUsersApi, 'listAdminUsers').mockRejectedValue(new Error('500'));

        const w = await mountWithGlobals(UserListPage, {
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
        });
        seedAdminUser();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="user-list-error"]').exists()).toBe(true);
        expect(w.find('[data-testid="user-list-table"]').exists()).toBe(false);
    });

    it('STATE 4 (empty): renders EmptyState when the query returns no rows and no filter is active', async () => {
        vi.spyOn(adminUsersApi, 'listAdminUsers').mockResolvedValue(EMPTY_RESPONSE);

        const w = await mountWithGlobals(UserListPage, {
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
        });
        seedAdminUser();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        // Empty-by-nature, not empty-filtered, because no filter is set.
        expect(w.find('[data-testid="user-list-empty"]').exists()).toBe(true);
        expect(w.find('[data-testid="user-list-empty-filtered"]').exists()).toBe(false);
        expect(w.find('[data-testid="user-list-table"]').exists()).toBe(false);
    });

    it('STATE 5 (populated): renders the table with all returned rows', async () => {
        // The cross-tenant contract IS enforced at the backend (Phase 2A
        // Session 2 LOAD-BEARING test pinned that). The SPA trusts the
        // server-filtered list and renders exactly what came back —
        // this test asserts the row count + cell content match the
        // populated fixture (which represents one tenant's users only).
        vi.spyOn(adminUsersApi, 'listAdminUsers').mockResolvedValue(POPULATED_RESPONSE);

        const w = await mountWithGlobals(UserListPage, {
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
        });
        seedAdminUser();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="user-list-table"]').exists()).toBe(true);
        // Both rows render with their names — the SPA-side cross-tenant
        // contract is "render what the server sent". The backend's
        // tenant-isolation test (UserIndexTest:isolates tenants) pins
        // that the server's response is correctly scoped.
        expect(w.find('[data-testid="user-list-row-name-10"]').exists()).toBe(true);
        expect(w.find('[data-testid="user-list-row-name-11"]').exists()).toBe(true);
        expect(w.text()).toContain('Alice in Tenant A');
        expect(w.text()).toContain('Bob in Tenant A');

        // States 1-4 are all hidden.
        expect(w.find('[data-testid="user-list-permission-denied"]').exists()).toBe(false);
        expect(w.find('[data-testid="user-list-loading"]').exists()).toBe(false);
        expect(w.find('[data-testid="user-list-error"]').exists()).toBe(false);
        expect(w.find('[data-testid="user-list-empty"]').exists()).toBe(false);
    });
});
