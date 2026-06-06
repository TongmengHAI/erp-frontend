import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import type { RouteRecordRaw } from 'vue-router';

import RoleDetailPage from '@/modules/admin/pages/RoleDetailPage.vue';
import * as adminRolesApi from '@/modules/admin/api/roles';
import * as permissionsApi from '@/modules/admin/api/permissions';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// RoleDetailPage — 5-state matrix + system/custom button visibility.
//
// Per Phase 2B Session 3 deliberate item #3, Edit + Delete buttons MUST
// render ONLY on custom roles. System roles surface as read-only with
// no destructive affordance — defense-in-depth (the backend's
// RoleImmutableException would 403 the mutation anyway, but UI gating
// avoids the round-trip).
//
// PermissionList is the read-only permission tree component; this spec
// asserts it appears on the detail page. The Session 4 PermissionPicker
// (interactive editor) is a SEPARATE component — this test does not
// reference PermissionPicker at all.
//
// Per-test QueryClient with retry: false — same as UserDetailPage's spec.
// ─────────────────────────────────────────────────────────────────────────────

function freshVueQueryPlugin() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
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

function seedAdmin(permissions: string[] = ['roles.view', 'roles.update', 'roles.delete']): void {
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
        permissions,
    });
}

function seedNonAdmin(): void {
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

const PERMISSION_DESCRIPTIONS = {
    data: {
        domains: { hrm: 'HRM', settings: 'Settings' },
        permissions: {
            'hrm.employee.view': 'View employees',
            'hrm.employee.create': 'Create employees',
            'settings.hrm.view': 'View HRM settings',
        },
    },
};

function customRoleResponse(id: number, name = 'Senior Accountant') {
    return {
        data: {
            id,
            name,
            description: 'Custom role for senior accountants.',
            label: name,
            is_system: false,
            is_custom: true,
            team_id: 99,
            is_deleted: false,
            permissions: [
                { id: 1, name: 'hrm.employee.view' },
                { id: 2, name: 'hrm.employee.create' },
            ],
            users_count: 3,
            created_at: '2026-06-01T00:00:00+00:00',
            updated_at: '2026-06-01T00:00:00+00:00',
        },
    };
}

function systemRoleResponse(id = 100, name = 'tenant_admin') {
    return {
        data: {
            id,
            name,
            description: 'Full access within the tenant.',
            label: 'Tenant Administrator',
            is_system: true,
            is_custom: false,
            team_id: null,
            is_deleted: false,
            permissions: [
                { id: 1, name: 'hrm.employee.view' },
                { id: 3, name: 'settings.hrm.view' },
            ],
            users_count: 1,
            created_at: '2026-05-12T00:00:00+00:00',
            updated_at: '2026-05-12T00:00:00+00:00',
        },
    };
}

describe('RoleDetailPage — 5-state matrix', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(permissionsApi, 'getPermissionDescriptions').mockResolvedValue(
            PERMISSION_DESCRIPTIONS,
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('STATE 1 (permission-denied): renders PermissionDeniedPage when user lacks roles.view', async () => {
        vi.spyOn(adminRolesApi, 'getAdminRole').mockImplementation(
            () => new Promise(() => undefined),
        );

        const w = await mountWithGlobals(RoleDetailPage, {
            props: { id: 1 },
            extraPlugins: [ToastService, ConfirmationService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/roles/1',
        });
        seedNonAdmin();
        await w.vm.$nextTick();

        expect(w.find('[data-testid="role-detail-permission-denied"]').exists()).toBe(true);
        expect(w.find('[data-testid="role-detail-name"]').exists()).toBe(false);
    });

    it('STATE 2 (loading): renders LoadingState while the query is in-flight', async () => {
        vi.spyOn(adminRolesApi, 'getAdminRole').mockImplementation(
            () => new Promise(() => undefined),
        );

        const w = await mountWithGlobals(RoleDetailPage, {
            props: { id: 1 },
            extraPlugins: [ToastService, ConfirmationService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/roles/1',
        });
        seedAdmin();
        await w.vm.$nextTick();

        expect(w.find('[data-testid="role-detail-loading"]').exists()).toBe(true);
        expect(w.find('[data-testid="role-detail-name"]').exists()).toBe(false);
    });

    it('STATE 3 (404): renders NotFoundPage when the API returns 404', async () => {
        const notFound = Object.assign(new Error('Not Found'), {
            isAxiosError: true,
            response: { status: 404, data: {} },
        });
        vi.spyOn(adminRolesApi, 'getAdminRole').mockRejectedValue(notFound);

        const w = await mountWithGlobals(RoleDetailPage, {
            props: { id: 999 },
            extraPlugins: [ToastService, ConfirmationService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/roles/999',
        });
        seedAdmin();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="role-detail-not-found"]').exists()).toBe(true);
        expect(w.find('[data-testid="role-detail-error"]').exists()).toBe(false);
    });

    it('STATE 4 (error): renders ErrorState on generic load failure', async () => {
        const generic = Object.assign(new Error('500'), {
            isAxiosError: true,
            response: { status: 500, data: {} },
        });
        vi.spyOn(adminRolesApi, 'getAdminRole').mockRejectedValue(generic);

        const w = await mountWithGlobals(RoleDetailPage, {
            props: { id: 1 },
            extraPlugins: [ToastService, ConfirmationService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/roles/1',
        });
        seedAdmin();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="role-detail-error"]').exists()).toBe(true);
        expect(w.find('[data-testid="role-detail-not-found"]').exists()).toBe(false);
    });

    it('STATE 5 (populated, CUSTOM role): renders the detail, the PermissionList, and BOTH Edit + Delete buttons', async () => {
        vi.spyOn(adminRolesApi, 'getAdminRole').mockResolvedValue(customRoleResponse(10));

        const w = await mountWithGlobals(RoleDetailPage, {
            props: { id: 10 },
            extraPlugins: [ToastService, ConfirmationService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/roles/10',
        });
        seedAdmin();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="role-detail-name"]').exists()).toBe(true);
        expect(w.text()).toContain('Senior Accountant');

        // PermissionList component is mounted (not PermissionPicker).
        expect(w.find('[data-testid="permission-list"]').exists()).toBe(true);

        // Custom badge appears, system badge does NOT.
        expect(w.find('[data-testid="role-detail-badge-custom"]').exists()).toBe(true);
        expect(w.find('[data-testid="role-detail-badge-system"]').exists()).toBe(false);

        // BOTH Edit + Delete present on custom rows.
        expect(w.find('[data-testid="role-detail-edit"]').exists()).toBe(true);
        expect(w.find('[data-testid="role-detail-delete"]').exists()).toBe(true);
    });
});

describe('RoleDetailPage — system vs custom button visibility', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(permissionsApi, 'getPermissionDescriptions').mockResolvedValue(
            PERMISSION_DESCRIPTIONS,
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('LOAD-BEARING: Edit + Delete buttons DO NOT render on system roles, even when actor has both perms', async () => {
        // System-role guard at the UI layer (locked decision Q15 +
        // Session 3 deliberate item #3). Defense-in-depth — the backend
        // would 403 the mutation with system_role_immutable anyway, but
        // the UI gating prevents the user from seeing the buttons.
        vi.spyOn(adminRolesApi, 'getAdminRole').mockResolvedValue(systemRoleResponse());

        const w = await mountWithGlobals(RoleDetailPage, {
            props: { id: 100 },
            extraPlugins: [ToastService, ConfirmationService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/roles/100',
        });
        seedAdmin(['roles.view', 'roles.update', 'roles.delete']);

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        // The detail loaded.
        expect(w.find('[data-testid="role-detail-name"]').exists()).toBe(true);

        // System badge appears, custom badge does NOT.
        expect(w.find('[data-testid="role-detail-badge-system"]').exists()).toBe(true);
        expect(w.find('[data-testid="role-detail-badge-custom"]').exists()).toBe(false);

        // NEITHER Edit NOR Delete render on system rows.
        expect(w.find('[data-testid="role-detail-edit"]').exists()).toBe(false);
        expect(w.find('[data-testid="role-detail-delete"]').exists()).toBe(false);

        // PermissionList still appears — the permissions are visible
        // (read-only) even though the role itself can't be mutated.
        expect(w.find('[data-testid="permission-list"]').exists()).toBe(true);
    });

    it('Edit button does NOT render on custom role when actor lacks roles.update', async () => {
        vi.spyOn(adminRolesApi, 'getAdminRole').mockResolvedValue(customRoleResponse(10));

        const w = await mountWithGlobals(RoleDetailPage, {
            props: { id: 10 },
            extraPlugins: [ToastService, ConfirmationService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/roles/10',
        });
        seedAdmin(['roles.view', 'roles.delete']);

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="role-detail-edit"]').exists()).toBe(false);
        // Delete still appears (the actor has roles.delete).
        expect(w.find('[data-testid="role-detail-delete"]').exists()).toBe(true);
    });

    it('Delete button does NOT render on custom role when actor lacks roles.delete', async () => {
        vi.spyOn(adminRolesApi, 'getAdminRole').mockResolvedValue(customRoleResponse(10));

        const w = await mountWithGlobals(RoleDetailPage, {
            props: { id: 10 },
            extraPlugins: [ToastService, ConfirmationService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/roles/10',
        });
        seedAdmin(['roles.view', 'roles.update']);

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="role-detail-edit"]').exists()).toBe(true);
        expect(w.find('[data-testid="role-detail-delete"]').exists()).toBe(false);
    });
});
