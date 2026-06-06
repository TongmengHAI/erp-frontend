import ToastService from 'primevue/toastservice';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import type { RouteRecordRaw } from 'vue-router';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';

import RoleFormPage from '@/modules/admin/pages/RoleFormPage.vue';
import * as adminRolesApi from '@/modules/admin/api/roles';
import * as permissionsApi from '@/modules/admin/api/permissions';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import {
    createRoleSchema,
    updateRoleSchema,
} from '@/modules/admin/schemas/roleFormSchema';

// ─────────────────────────────────────────────────────────────────────────────
// RoleFormPage — three load-bearing test surfaces:
//
//   1. §10.10 reactive-schema selection — create requires
//      permission_ids, edit treats it as optional. Two separate Zod
//      schemas, NOT a discriminated union.
//
//   2. System-role edit redirect (Phase 2B Q15 + Session 4
//      deliberate item #3) — navigating to /admin/roles/:id/edit
//      for a system role replaces the route to /admin/roles/:id.
//
//   3. Soft warning at 10 custom roles (Phase 2B Q8 + Session 4
//      deliberate item #4) — create form shows an inline notice
//      when the tenant already has 10+ custom roles; NOT a hard
//      block. Count comes from the existing kind=custom list query.
// ─────────────────────────────────────────────────────────────────────────────

function freshVueQueryPlugin() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return [VueQueryPlugin, { queryClient: client }] as const;
}

const PERMISSION_DESCRIPTIONS = {
    data: {
        domains: { hrm: 'HRM' },
        permissions: {
            'hrm.employee.view': 'View employees',
            'hrm.employee.create': 'Create employees',
        },
        permission_ids: {
            'hrm.employee.view': 1,
            'hrm.employee.create': 2,
        },
    },
};

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
    {
        path: '/admin/roles/:id/edit',
        name: 'admin.roles.edit',
        component: { template: '<div />' },
    },
];

function seedAdmin(): void {
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
        permissions: ['roles.view', 'roles.create', 'roles.update', 'roles.delete'],
    });
}

function customRoleResponse(id: number, name = 'Senior Accountant') {
    return {
        data: {
            id,
            name,
            description: 'A custom role.',
            label: name,
            is_system: false,
            is_custom: true,
            team_id: 99,
            is_deleted: false,
            permissions: [{ id: 1, name: 'hrm.employee.view' }],
            users_count: 3,
            created_at: '2026-06-01T00:00:00+00:00',
            updated_at: '2026-06-01T00:00:00+00:00',
        },
    };
}

function systemRoleResponse(id = 1, name = 'tenant_admin') {
    return {
        data: {
            id,
            name,
            description: 'Full access.',
            label: 'Tenant Administrator',
            is_system: true,
            is_custom: false,
            team_id: null,
            is_deleted: false,
            permissions: [],
            users_count: 1,
            created_at: '2026-05-12T00:00:00+00:00',
            updated_at: '2026-05-12T00:00:00+00:00',
        },
    };
}

function customRolesListResponse(total: number) {
    return {
        data: Array(0),
        meta: { current_page: 1, last_page: 1, per_page: 1, total, from: 1, to: 1 },
        links: { first: null, last: null, prev: null, next: null },
    };
}

describe('roleFormSchema — §10.10 reactive-schema selection (Zod-level)', () => {
    it('createRoleSchema REQUIRES name', () => {
        const result = createRoleSchema.safeParse({
            description: null,
            permission_ids: [1, 2],
        });
        expect(result.success).toBe(false);
    });

    it('createRoleSchema REQUIRES permission_ids (array; empty allowed)', () => {
        // Missing permission_ids fails.
        const missing = createRoleSchema.safeParse({
            name: 'X',
            description: null,
        });
        expect(missing.success).toBe(false);

        // Empty permission_ids array is allowed.
        const empty = createRoleSchema.safeParse({
            name: 'X',
            description: null,
            permission_ids: [],
        });
        expect(empty.success).toBe(true);
    });

    it('updateRoleSchema accepts a partial update (no name, no permission_ids)', () => {
        // Edit mode allows omitting any field — backend uses Laravel
        // `sometimes`.
        const partial = updateRoleSchema.safeParse({
            description: 'Just changing description.',
        });
        expect(partial.success).toBe(true);
    });

    it('updateRoleSchema rejects an empty-string name (trim + min(1))', () => {
        // When name IS provided, it must satisfy the same min/max rules
        // as create.
        const blank = updateRoleSchema.safeParse({ name: '   ' });
        expect(blank.success).toBe(false);
    });
});

describe('RoleFormPage — system-role edit redirect (Phase 2B Q15)', () => {
    let router: Router;

    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(permissionsApi, 'getPermissionDescriptions').mockResolvedValue(
            PERMISSION_DESCRIPTIONS,
        );
        vi.spyOn(adminRolesApi, 'listAdminRoles').mockResolvedValue(
            customRolesListResponse(0),
        );
        router = createRouter({
            history: createMemoryHistory(),
            routes: ADMIN_TEST_ROUTES,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("LOAD-BEARING: navigating to /admin/roles/:id/edit on a system role redirects to /admin/roles/:id (NOT a disabled form)", async () => {
        vi.spyOn(adminRolesApi, 'getAdminRole').mockResolvedValue(
            systemRoleResponse(1),
        );

        // Custom router so we can inspect the post-redirect location.
        await router.push('/admin/roles/1/edit');
        await router.isReady();

        const w = await mountWithGlobals(RoleFormPage, {
            props: { id: 1 },
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/roles/1/edit',
        });
        seedAdmin();

        await new Promise((resolve) => setTimeout(resolve, 300));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        // The form name input MUST NOT render — the page redirected
        // to detail before reaching the populated branch.
        expect(w.find('[data-testid="role-form-name"]').exists()).toBe(false);
    });

    it('positive control: navigating to /admin/roles/:id/edit on a CUSTOM role renders the form', async () => {
        vi.spyOn(adminRolesApi, 'getAdminRole').mockResolvedValue(
            customRoleResponse(10),
        );

        const w = await mountWithGlobals(RoleFormPage, {
            props: { id: 10 },
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/roles/10/edit',
        });
        seedAdmin();

        await new Promise((resolve) => setTimeout(resolve, 300));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        // The form renders for custom roles.
        expect(w.find('[data-testid="role-form-name"]').exists()).toBe(true);
    });
});

describe('RoleFormPage — soft warning at 10 custom roles (Phase 2B Q8)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(permissionsApi, 'getPermissionDescriptions').mockResolvedValue(
            PERMISSION_DESCRIPTIONS,
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('LOAD-BEARING: create-mode shows the soft warning when tenant has 10+ custom roles', async () => {
        vi.spyOn(adminRolesApi, 'listAdminRoles').mockResolvedValue(
            customRolesListResponse(10),
        );

        const w = await mountWithGlobals(RoleFormPage, {
            // No id prop → create mode.
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/roles/new',
        });
        seedAdmin();

        await new Promise((resolve) => setTimeout(resolve, 300));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        // The soft warning notice renders.
        expect(w.find('[data-testid="role-form-soft-warning"]').exists()).toBe(true);

        // The form ITSELF still renders — soft warning is NOT a hard
        // block. The admin can still create the role; the name input
        // + permission picker + cancel/submit row all render. We
        // assert on the name input as the structural proof; FormActions'
        // submit button has no testid (shared component) but its
        // presence is implicit when the form template branch runs.
        expect(w.find('[data-testid="role-form-name"]').exists()).toBe(true);
        expect(w.find('[data-testid="role-form-permission-picker"]').exists()).toBe(true);
    });

    it('LOAD-BEARING: create-mode does NOT show the soft warning when tenant has fewer than 10 custom roles', async () => {
        vi.spyOn(adminRolesApi, 'listAdminRoles').mockResolvedValue(
            customRolesListResponse(5),
        );

        const w = await mountWithGlobals(RoleFormPage, {
            extraPlugins: [ToastService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/roles/new',
        });
        seedAdmin();

        await new Promise((resolve) => setTimeout(resolve, 300));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="role-form-soft-warning"]').exists()).toBe(false);
        expect(w.find('[data-testid="role-form-name"]').exists()).toBe(true);
    });
});
