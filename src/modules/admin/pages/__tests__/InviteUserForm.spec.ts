import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import type { RouteRecordRaw } from 'vue-router';

import InviteUserForm from '@/modules/admin/pages/InviteUserForm.vue';
import * as adminUsersApi from '@/modules/admin/api/users';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// InviteUserForm — 5-state-matrix spec + LOAD-BEARING
// email_globally_registered UX.
//
// The form is a composite component: it depends on a role-options
// query before it can render its Select. Same §10.18 discipline at a
// smaller scale — page owns the state, the form-vs-fallback decision
// lives at the page level.
//
// States covered:
//   1. permission-denied — user lacks users.invite
//   2. loading           — role options query in-flight
//   3. error             — role options query failed
//   4. populated         — form renders, ready for input
//   5. LOAD-BEARING: 422 email_globally_registered surfaces friendly
//                    inline error via setErrors (per Q10 Option A)
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
        path: '/admin/users',
        name: 'admin.users.list',
        component: { template: '<div />' },
    },
    {
        path: '/admin/users/invite',
        name: 'admin.users.invite',
        component: { template: '<div />' },
    },
    {
        path: '/admin/users/:id',
        name: 'admin.users.detail',
        component: { template: '<div />' },
    },
    {
        path: '/admin/users/:id/edit',
        name: 'admin.users.edit',
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
        permissions: ['users.view', 'users.invite', 'users.update', 'users.disable', 'users.deactivate'],
    });
}

function seedNonAdminUser(): void {
    const auth = useAuthStore();
    auth.$patch({
        user: {
            id: 2,
            name: 'No-Perm User',
            email: 'viewer@example.com',
            email_verified_at: null,
            type: 'tenant_user',
            is_super_admin: false,
        },
        permissions: ['users.view'], // can view but cannot invite
    });
}

const ROLE_OPTIONS_RESPONSE = {
    data: [
        { id: 1, name: 'accountant' },
        { id: 2, name: 'tenant_admin' },
        { id: 3, name: 'viewer' },
    ],
};

describe('InviteUserForm — composite-page state matrix', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('STATE 1 (permission-denied): renders PermissionDeniedPage when user lacks users.invite', async () => {
        vi.spyOn(adminUsersApi, 'listRoleOptions').mockImplementation(
            () => new Promise(() => undefined),
        );

        const w = await mountWithGlobals(InviteUserForm, {
            extraPlugins: [ToastService, ConfirmationService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/users/invite',
        });
        seedNonAdminUser();
        await w.vm.$nextTick();

        expect(w.find('[data-testid="invite-user-permission-denied"]').exists()).toBe(true);
        expect(w.find('[data-testid="invite-user-email"]').exists()).toBe(false);
    });

    it('STATE 2 (loading): renders LoadingState while role options are in-flight', async () => {
        vi.spyOn(adminUsersApi, 'listRoleOptions').mockImplementation(
            () => new Promise(() => undefined),
        );

        const w = await mountWithGlobals(InviteUserForm, {
            extraPlugins: [ToastService, ConfirmationService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/users/invite',
        });
        seedAdminUser();
        await w.vm.$nextTick();

        expect(w.find('[data-testid="invite-user-loading"]').exists()).toBe(true);
        expect(w.find('[data-testid="invite-user-email"]').exists()).toBe(false);
    });

    it('STATE 3 (error): renders ErrorState when role options fetch fails', async () => {
        vi.spyOn(adminUsersApi, 'listRoleOptions').mockRejectedValue(new Error('500'));

        const w = await mountWithGlobals(InviteUserForm, {
            extraPlugins: [ToastService, ConfirmationService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/users/invite',
        });
        seedAdminUser();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="invite-user-roles-error"]').exists()).toBe(true);
        expect(w.find('[data-testid="invite-user-email"]').exists()).toBe(false);
    });

    it('STATE 4 (populated): renders the form with email + name + role fields', async () => {
        vi.spyOn(adminUsersApi, 'listRoleOptions').mockResolvedValue(ROLE_OPTIONS_RESPONSE);

        const w = await mountWithGlobals(InviteUserForm, {
            extraPlugins: [ToastService, ConfirmationService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/users/invite',
        });
        seedAdminUser();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="invite-user-email"]').exists()).toBe(true);
        expect(w.find('[data-testid="invite-user-name"]').exists()).toBe(true);
        expect(w.find('[data-testid="invite-user-role"]').exists()).toBe(true);
        expect(w.find('[data-testid="invite-user-loading"]').exists()).toBe(false);
        expect(w.find('[data-testid="invite-user-permission-denied"]').exists()).toBe(false);
    });
});

describe('InviteUserForm — LOAD-BEARING 422 UX paths', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("LOAD-BEARING: 422 email_globally_registered renders the friendly inline message on the email field", async () => {
        // Per Q10 Option A — when admin invites an email that already
        // exists as a user in any tenant, the backend returns 422 with
        // error_code='email_globally_registered'. The form must surface
        // a clear friendly message, NOT the generic "validation failed"
        // copy. The inline error appears under the email field via
        // VeeValidate's setErrors.
        vi.spyOn(adminUsersApi, 'listRoleOptions').mockResolvedValue(ROLE_OPTIONS_RESPONSE);

        const error = new Error('Request failed') as Error & {
            isAxiosError?: boolean;
            response?: { status: number; data: unknown };
        };
        error.isAxiosError = true;
        error.response = {
            status: 422,
            data: {
                message: 'The given data was invalid.',
                errors: {
                    email: ['This email is already registered to another organization.'],
                },
                error_code: 'email_globally_registered',
            },
        };

        vi.spyOn(adminUsersApi, 'inviteUser').mockRejectedValue(error);

        const w = await mountWithGlobals(InviteUserForm, {
            extraPlugins: [ToastService, ConfirmationService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/users/invite',
        });
        seedAdminUser();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        // Fill the form with valid input and submit.
        const emailInput = w.find('[data-testid="invite-user-email"]').element as HTMLInputElement;
        emailInput.value = 'alice@example.com';
        emailInput.dispatchEvent(new Event('input'));
        await w.vm.$nextTick();

        // Set role_id via the Select (PV component) — simulate the
        // useField change handler firing.
        const formVm = w.vm as { handleRoleIdChange?: (v: number) => void };
        if (formVm.handleRoleIdChange) {
            formVm.handleRoleIdChange(2);
            await w.vm.$nextTick();
        }

        // Submit by calling the page's onSubmit directly through form.
        const form = w.find('form');
        await form.trigger('submit.prevent');

        // Wait for the mutation rejection + setErrors propagation.
        await new Promise((resolve) => setTimeout(resolve, 100));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        // The friendly i18n message appears under the email field.
        // VeeValidate renders errors via FormField's error slot — the
        // text content of the form should contain the localized string.
        const text = w.text();
        expect(text).toContain('already registered to another organization');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2B Session 5 — roles.assign granularity passive note.
//
// The role-options endpoint is server-filtered (Session 2's
// RoleOptionsController Tightening 2 — system rows only when the
// actor lacks roles.assign). The passive note is a UX hint about
// the filtered shape, NOT the filtering itself; it reads the actor's
// own permission via auth.can('roles.assign'), not the response.
//
// Architectural separation: visible affordance is a hint; actual
// filtering is server-enforced. The test pins both halves — note
// presence when permission absent + note absence when permission
// present.
// ─────────────────────────────────────────────────────────────────────────────

function seedInviterWithoutAssign(): void {
    const auth = useAuthStore();
    auth.$patch({
        user: {
            id: 3,
            name: 'Inviter (no roles.assign)',
            email: 'inviter@example.com',
            email_verified_at: null,
            type: 'tenant_user',
            is_super_admin: false,
        },
        permissions: ['users.view', 'users.invite'],
    });
}

function seedInviterWithAssign(): void {
    const auth = useAuthStore();
    auth.$patch({
        user: {
            id: 4,
            name: 'Inviter (with roles.assign)',
            email: 'inviter2@example.com',
            email_verified_at: null,
            type: 'tenant_user',
            is_super_admin: false,
        },
        permissions: ['users.view', 'users.invite', 'roles.assign'],
    });
}

describe('InviteUserForm — roles.assign granularity passive note', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('LOAD-BEARING: passive note renders when actor lacks roles.assign', async () => {
        vi.spyOn(adminUsersApi, 'listRoleOptions').mockResolvedValue(
            ROLE_OPTIONS_RESPONSE,
        );

        const w = await mountWithGlobals(InviteUserForm, {
            extraPlugins: [ToastService, ConfirmationService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/users/invite',
        });
        seedInviterWithoutAssign();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        // The form mounted (positive proof we're at the populated branch).
        expect(w.find('[data-testid="invite-user-email"]').exists()).toBe(true);
        // The passive note renders.
        expect(w.find('[data-testid="invite-user-role-assign-note"]').exists()).toBe(true);
    });

    it('positive control: passive note does NOT render when actor has roles.assign', async () => {
        vi.spyOn(adminUsersApi, 'listRoleOptions').mockResolvedValue(
            ROLE_OPTIONS_RESPONSE,
        );

        const w = await mountWithGlobals(InviteUserForm, {
            extraPlugins: [ToastService, ConfirmationService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: '/admin/users/invite',
        });
        seedInviterWithAssign();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="invite-user-email"]').exists()).toBe(true);
        expect(w.find('[data-testid="invite-user-role-assign-note"]').exists()).toBe(false);
    });
});
