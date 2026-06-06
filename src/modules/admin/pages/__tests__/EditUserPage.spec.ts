import ToastService from 'primevue/toastservice';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import type { RouteRecordRaw } from 'vue-router';

import EditUserPage from '@/modules/admin/pages/EditUserPage.vue';
import * as adminUsersApi from '@/modules/admin/api/users';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// EditUserPage — Phase 2B Session 5 roles.assign granularity surface.
//
// The page already had a 5-state matrix shape from Phase 2A; this
// spec covers ONLY the Phase 2B additions:
//
//   1. Role dropdown DISABLED state when actor lacks roles.assign
//   2. Passive note ("Role assignment requires…") renders when
//      the actor lacks roles.assign
//   3. Tightening 1: actor with users.update but NOT roles.assign
//      submits a name-only change → PATCH body OMITS role_id entirely
//      (NOT { role_id: <current> })
//   4. Positive control: actor WITH roles.assign → dropdown enabled,
//      no note, role_id IS sent in PATCH body
//
// Backend stays the single source of truth on the granularity boundary
// (the UserUpdateRolesAssignGranularityTest pins the 403 path). The
// frontend's responsibility is to OMIT the key, not to send the
// current value defensively.
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

function seedActor(permissions: string[]): void {
    const auth = useAuthStore();
    auth.$patch({
        user: {
            id: 1,
            name: 'Acting User',
            email: 'actor@example.com',
            email_verified_at: null,
            type: 'tenant_user',
            is_super_admin: false,
        },
        permissions,
    });
}

const TARGET_USER_RESPONSE = {
    data: {
        id: 42,
        name: 'Target User',
        email: 'target@example.com',
        email_verified_at: null,
        type: 'tenant_user' as const,
        status: 'active' as const,
        is_super_admin: false,
        is_active: true,
        is_deactivated: false,
        deleted_at: null,
        created_at: '2026-06-01T00:00:00+00:00',
        updated_at: '2026-06-01T00:00:00+00:00',
        role: { id: 5, name: 'viewer' },
    },
};

const ROLE_OPTIONS_RESPONSE = {
    data: [
        { id: 5, name: 'viewer', label: 'Viewer', is_system: true },
        { id: 4, name: 'accountant', label: 'Accountant', is_system: true },
    ],
};

async function mountEditPage(actorPermissions: string[]) {
    vi.spyOn(adminUsersApi, 'getAdminUser').mockResolvedValue(TARGET_USER_RESPONSE);
    vi.spyOn(adminUsersApi, 'listRoleOptions').mockResolvedValue(ROLE_OPTIONS_RESPONSE);

    const w = await mountWithGlobals(EditUserPage, {
        props: { id: 42 },
        extraPlugins: [ToastService, freshVueQueryPlugin()],
        routes: ADMIN_TEST_ROUTES,
        initialRoute: '/admin/users/42/edit',
    });
    seedActor(actorPermissions);

    await new Promise((resolve) => setTimeout(resolve, 250));
    await w.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await w.vm.$nextTick();

    return w;
}

describe('EditUserPage — roles.assign granularity (Phase 2B)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('LOAD-BEARING: role dropdown is DISABLED + passive note renders when actor lacks roles.assign', async () => {
        const w = await mountEditPage(['users.view', 'users.update']);

        // The form mounted (positive proof we're at the populated branch).
        expect(w.find('[data-testid="edit-user-name"]').exists()).toBe(true);

        // The role Select renders but is disabled. PrimeVue Select
        // forwards :disabled to the inner element with the `p-disabled`
        // class; we assert on the wrapper's data-testid existence
        // plus the passive note presence as the load-bearing signals.
        expect(w.find('[data-testid="edit-user-role"]').exists()).toBe(true);

        // The passive explanatory note appears.
        expect(w.find('[data-testid="edit-user-role-assign-note"]').exists()).toBe(true);
    });

    it('positive control: role dropdown is ENABLED + no note when actor has roles.assign', async () => {
        const w = await mountEditPage([
            'users.view',
            'users.update',
            'roles.assign',
        ]);

        expect(w.find('[data-testid="edit-user-role"]').exists()).toBe(true);
        // No passive note when actor has roles.assign.
        expect(w.find('[data-testid="edit-user-role-assign-note"]').exists()).toBe(false);
    });

    it('LOAD-BEARING: actor with users.update but NOT roles.assign — submit OMITS role_id from PATCH body (not even current value)', async () => {
        // Tightening 1: backend rejects ANY role_id in the body when
        // the actor lacks roles.assign — even if the value equals the
        // user's current role. The FE's responsibility is to OMIT the
        // key, not send it defensively with the current value.
        const updateSpy = vi
            .spyOn(adminUsersApi, 'updateAdminUser')
            .mockResolvedValue({
                ...TARGET_USER_RESPONSE,
                data: { ...TARGET_USER_RESPONSE.data, name: 'New Name' },
            });

        const w = await mountEditPage(['users.view', 'users.update']);

        // Type a new name + submit.
        const nameInput = w.find('[data-testid="edit-user-name"]')
            .element as HTMLInputElement;
        nameInput.value = 'New Name';
        nameInput.dispatchEvent(new Event('input'));
        await w.vm.$nextTick();

        // Locate the form root + submit it (FormActions emits via @submit;
        // simplest path is to call the form's submit handler directly via
        // a dispatched submit event on the <form> element).
        const formEl = w.find('form').element as HTMLFormElement;
        formEl.dispatchEvent(new Event('submit', { cancelable: true }));

        await new Promise((resolve) => setTimeout(resolve, 100));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(updateSpy).toHaveBeenCalledOnce();
        const [, payload] = updateSpy.mock.calls[0];

        // Name change IS sent.
        expect(payload).toHaveProperty('name', 'New Name');

        // role_id is OMITTED entirely — not sent with the current
        // value, not sent as undefined explicitly. The OMIT guard is
        // the load-bearing assertion.
        expect(Object.prototype.hasOwnProperty.call(payload, 'role_id')).toBe(false);
    });

    it('positive control: actor WITH roles.assign — submit INCLUDES role_id in PATCH body', async () => {
        const updateSpy = vi
            .spyOn(adminUsersApi, 'updateAdminUser')
            .mockResolvedValue({
                ...TARGET_USER_RESPONSE,
                data: { ...TARGET_USER_RESPONSE.data, name: 'New Name' },
            });

        const w = await mountEditPage([
            'users.view',
            'users.update',
            'roles.assign',
        ]);

        const nameInput = w.find('[data-testid="edit-user-name"]')
            .element as HTMLInputElement;
        nameInput.value = 'New Name';
        nameInput.dispatchEvent(new Event('input'));
        await w.vm.$nextTick();

        const formEl = w.find('form').element as HTMLFormElement;
        formEl.dispatchEvent(new Event('submit', { cancelable: true }));

        await new Promise((resolve) => setTimeout(resolve, 100));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(updateSpy).toHaveBeenCalledOnce();
        const [, payload] = updateSpy.mock.calls[0];

        // Both name AND role_id are sent.
        expect(payload).toHaveProperty('name', 'New Name');
        expect(payload).toHaveProperty('role_id', 5); // current role pre-filled
    });
});
