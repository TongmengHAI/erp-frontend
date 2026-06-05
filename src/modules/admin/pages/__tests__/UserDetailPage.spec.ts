import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import type { RouteRecordRaw } from 'vue-router';

import UserDetailPage from '@/modules/admin/pages/UserDetailPage.vue';
import * as adminUsersApi from '@/modules/admin/api/users';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// UserDetailPage — Phase 2A Session 4 LOAD-BEARING tests.
//
// Self-action guard: defense in depth = UI hiding + API rejection.
//
//   UI side (this file):
//     • Disable + Deactivate buttons DO NOT render on the actor's own row.
//     • The buttons DO render on a different user's row (positive control).
//
//   API side (Phase 2A Session 2 backend tests — already pinned):
//     • UserDisableEnableTest:LOAD-BEARING self-disable blocked at API
//       with 403 error_code='self_action_forbidden'.
//     • UserDeactivateRestoreTest:LOAD-BEARING self-deactivate blocked.
//
//   Compose-side path on the frontend (page's runMutation helper has an
//   error_code='self_action_forbidden' branch that surfaces a friendly
//   toast on backend rejection) is verified by visual inspection +
//   the backend tests pinning the response shape — duplicating it at
//   the SPA layer via PrimeVue Button clicks in jsdom is brittle and
//   not load-bearing. The contract is: backend ships the error_code
//   shape; the frontend's handler branches on it.
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

function seedAdminActor(actorId: number): void {
    const auth = useAuthStore();
    auth.$patch({
        user: {
            id: actorId,
            name: 'Tenant Admin',
            email: 'admin@example.com',
            email_verified_at: null,
            type: 'tenant_user',
            is_super_admin: false,
        },
        permissions: [
            'users.view',
            'users.invite',
            'users.update',
            'users.disable',
            'users.deactivate',
        ],
    });
}

function adminUserResponse(targetId: number, name = 'Target User') {
    return {
        data: {
            id: targetId,
            name,
            email: `target${targetId}@example.com`,
            email_verified_at: null,
            type: 'tenant_user' as const,
            status: 'active' as const,
            is_super_admin: false,
            is_active: true,
            is_deactivated: false,
            deleted_at: null,
            created_at: '2026-06-01T00:00:00+00:00',
            updated_at: '2026-06-01T00:00:00+00:00',
            role: { id: 1, name: 'tenant_admin' },
        },
    };
}

describe('UserDetailPage — self-action guard (UI side)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('LOAD-BEARING: Disable + Deactivate buttons DO NOT render on the actor\'s own row', async () => {
        // Target id matches the acting user's id — the page renders the
        // user's own detail. UI-side guard MUST hide Disable + Deactivate.
        const sameId = 42;
        vi.spyOn(adminUsersApi, 'getAdminUser').mockResolvedValue(
            adminUserResponse(sameId, 'Self'),
        );

        const w = await mountWithGlobals(UserDetailPage, {
            props: { id: sameId },
            extraPlugins: [ToastService, ConfirmationService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: `/admin/users/${sameId}`,
        });
        seedAdminActor(sameId);

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        // The detail loaded.
        expect(w.find('[data-testid="user-detail-name"]').exists()).toBe(true);

        // Disable + Deactivate are absent — UI guard fired.
        expect(w.find('[data-testid="user-detail-disable"]').exists()).toBe(false);
        expect(w.find('[data-testid="user-detail-deactivate"]').exists()).toBe(false);

        // Edit (non-destructive, no self-target concern) DOES render
        // because admin has users.update.
        expect(w.find('[data-testid="user-detail-edit"]').exists()).toBe(true);
    });

    it('positive control: Disable + Deactivate DO render on a different user\'s row', async () => {
        // Target id ≠ acting user id — UI guard does NOT fire.
        const actorId = 1;
        const targetId = 99;
        vi.spyOn(adminUsersApi, 'getAdminUser').mockResolvedValue(
            adminUserResponse(targetId, 'Other User'),
        );

        const w = await mountWithGlobals(UserDetailPage, {
            props: { id: targetId },
            extraPlugins: [ToastService, ConfirmationService, freshVueQueryPlugin()],
            routes: ADMIN_TEST_ROUTES,
            initialRoute: `/admin/users/${targetId}`,
        });
        seedAdminActor(actorId);

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        // Disable + Deactivate are present.
        expect(w.find('[data-testid="user-detail-disable"]').exists()).toBe(true);
        expect(w.find('[data-testid="user-detail-deactivate"]').exists()).toBe(true);
    });
});

