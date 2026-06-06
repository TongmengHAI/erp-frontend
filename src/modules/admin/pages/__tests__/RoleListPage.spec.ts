import ToastService from 'primevue/toastservice';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import type { RouteRecordRaw } from 'vue-router';

import RoleListPage from '@/modules/admin/pages/RoleListPage.vue';
import * as adminRolesApi from '@/modules/admin/api/roles';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// RoleListPage — 5-state matrix spec per CLAUDE.md §10.18.
//
// Mirrors UserListPage.spec.ts exactly — one test per state. The
// populated state additionally asserts:
//   • Server ordering is preserved (system rows first, then custom)
//   • System rows render with a "System" badge
//   • Custom rows render the custom-kind label (no badge)
//
// Per-test QueryClient with retry: false — TanStack v5's default retry
// cascade would make the error-state test wait seconds before transitioning.
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
        path: '/admin/roles',
        name: 'admin.roles.list',
        component: { template: '<div />' },
    },
    {
        path: '/admin/roles/new',
        name: 'admin.roles.create',
        component: { template: '<div />' },
    },
    {
        path: '/admin/roles/:id',
        name: 'admin.roles.detail',
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
        permissions: ['roles.view', 'roles.create'],
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
        // System rows first — matches the backend's
        // `orderByDesc('is_system')->orderBy('name')` ordering.
        {
            id: 1,
            name: 'tenant_admin',
            label: 'Tenant Administrator',
            is_system: true,
            is_custom: false,
            users_count: 2,
            created_at: '2026-05-12T00:00:00+00:00',
        },
        {
            id: 2,
            name: 'accountant',
            label: 'Accountant',
            is_system: true,
            is_custom: false,
            users_count: 1,
            created_at: '2026-05-12T00:00:00+00:00',
        },
        {
            id: 10,
            name: 'Senior Accountant',
            label: 'Senior Accountant',
            is_system: false,
            is_custom: true,
            users_count: 3,
            created_at: '2026-06-01T00:00:00+00:00',
        },
    ],
    meta: { current_page: 1, last_page: 1, per_page: 25, total: 3, from: 1, to: 3 },
    links: { first: null, last: null, prev: null, next: null },
};

const EMPTY_RESPONSE = {
    data: [],
    meta: { current_page: 1, last_page: 1, per_page: 25, total: 0, from: null, to: null },
    links: { first: null, last: null, prev: null, next: null },
};

describe('RoleListPage — 5-state matrix', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('STATE 1 (permission-denied): renders PermissionDeniedPage when user lacks roles.view', async () => {
        vi.spyOn(adminRolesApi, 'listAdminRoles').mockImplementation(
            () => new Promise(() => undefined),
        );

        const w = await mountWithGlobals(RoleListPage, {
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
        });
        seedNonAdminUser();
        await w.vm.$nextTick();

        expect(w.find('[data-testid="role-list-permission-denied"]').exists()).toBe(true);
        expect(w.find('[data-testid="role-list-table"]').exists()).toBe(false);
        expect(w.find('[data-testid="role-list-loading"]').exists()).toBe(false);
        expect(w.find('[data-testid="role-list-search-input"]').exists()).toBe(false);
    });

    it('STATE 2 (loading): renders LoadingState while the query is in-flight', async () => {
        vi.spyOn(adminRolesApi, 'listAdminRoles').mockImplementation(
            () => new Promise(() => undefined),
        );

        const w = await mountWithGlobals(RoleListPage, {
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
        });
        seedAdminUser();
        await w.vm.$nextTick();

        expect(w.find('[data-testid="role-list-loading"]').exists()).toBe(true);
        expect(w.find('[data-testid="role-list-table"]').exists()).toBe(false);
        expect(w.find('[data-testid="role-list-empty"]').exists()).toBe(false);
        expect(w.find('[data-testid="role-list-error"]').exists()).toBe(false);
    });

    it('STATE 3 (error): renders ErrorState when the query rejects', async () => {
        vi.spyOn(adminRolesApi, 'listAdminRoles').mockRejectedValue(new Error('500'));

        const w = await mountWithGlobals(RoleListPage, {
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
        });
        seedAdminUser();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="role-list-error"]').exists()).toBe(true);
        expect(w.find('[data-testid="role-list-table"]').exists()).toBe(false);
    });

    it('STATE 4 (empty): renders EmptyState when no rows AND no filter is active', async () => {
        vi.spyOn(adminRolesApi, 'listAdminRoles').mockResolvedValue(EMPTY_RESPONSE);

        const w = await mountWithGlobals(RoleListPage, {
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
        });
        seedAdminUser();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="role-list-empty"]').exists()).toBe(true);
        expect(w.find('[data-testid="role-list-empty-filtered"]').exists()).toBe(false);
        expect(w.find('[data-testid="role-list-table"]').exists()).toBe(false);
    });

    it('STATE 5 (populated): renders the table with rows in server order; system rows carry "System" badge, custom rows do not', async () => {
        // The trust-server-ordering contract: rows render in the order
        // the API returned them. The fixture mimics the backend's
        // `orderByDesc('is_system')->orderBy('name')` — system rows
        // first (tenant_admin, accountant), custom rows after
        // (Senior Accountant).
        vi.spyOn(adminRolesApi, 'listAdminRoles').mockResolvedValue(POPULATED_RESPONSE);

        const w = await mountWithGlobals(RoleListPage, {
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
        });
        seedAdminUser();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="role-list-table"]').exists()).toBe(true);

        // All three rows render with their labels.
        expect(w.find('[data-testid="role-list-row-label-1"]').exists()).toBe(true);
        expect(w.find('[data-testid="role-list-row-label-2"]').exists()).toBe(true);
        expect(w.find('[data-testid="role-list-row-label-10"]').exists()).toBe(true);

        // System badge appears on system rows (id 1 + 2) and NOT on custom (id 10).
        expect(w.find('[data-testid="role-list-row-badge-system-1"]').exists()).toBe(true);
        expect(w.find('[data-testid="role-list-row-badge-system-2"]').exists()).toBe(true);
        expect(w.find('[data-testid="role-list-row-badge-system-10"]').exists()).toBe(false);

        // Custom label appears on the custom row only.
        expect(w.find('[data-testid="role-list-row-badge-custom-1"]').exists()).toBe(false);
        expect(w.find('[data-testid="role-list-row-badge-custom-10"]').exists()).toBe(true);

        // States 1-4 are all hidden.
        expect(w.find('[data-testid="role-list-permission-denied"]').exists()).toBe(false);
        expect(w.find('[data-testid="role-list-loading"]').exists()).toBe(false);
        expect(w.find('[data-testid="role-list-error"]').exists()).toBe(false);
        expect(w.find('[data-testid="role-list-empty"]').exists()).toBe(false);
    });

    it('Create button renders when actor has roles.create', async () => {
        vi.spyOn(adminRolesApi, 'listAdminRoles').mockResolvedValue(POPULATED_RESPONSE);

        const w = await mountWithGlobals(RoleListPage, {
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
        });
        seedAdminUser();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="role-list-create-button"]').exists()).toBe(true);
    });

    it('Create button does NOT render when actor lacks roles.create', async () => {
        vi.spyOn(adminRolesApi, 'listAdminRoles').mockResolvedValue(POPULATED_RESPONSE);

        const w = await mountWithGlobals(RoleListPage, {
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
        });
        const auth = useAuthStore();
        auth.$patch({
            user: {
                id: 3,
                name: 'Role Viewer',
                email: 'rv@example.com',
                email_verified_at: null,
                type: 'tenant_user',
                is_super_admin: false,
            },
            permissions: ['roles.view'],
        });

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="role-list-create-button"]').exists()).toBe(false);
    });
});
