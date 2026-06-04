import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as authApi from '@/modules/auth/api/auth';
import type { AuthMeResponse } from '@/modules/auth/types';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// useAuthStore — real implementation specs.
//
// All network calls are mocked at the auth API module boundary; we don't
// reach into the HTTP layer here (that's covered by client.spec.ts).
// ─────────────────────────────────────────────────────────────────────────────

const ME_OK: AuthMeResponse = {
    data: {
        user: {
            id: 42,
            name: 'Jane Bookkeeper',
            email: 'jane@acme.example',
            email_verified_at: '2026-05-12T08:00:00+00:00',
            type: 'tenant_user',
            is_super_admin: false,
        },
        tenant: {
            id: 7,
            slug: 'acme',
            name: 'Acme Trading Co.',
            country_code: 'KH',
            default_currency: 'USD',
            functional_currency: 'USD',
            timezone: 'Asia/Phnom_Penh',
        },
        current_company: {
            id: 3,
            slug: 'acme-trading',
            name: 'Acme Trading Co.',
            country_code: 'KH',
            default_currency: 'USD',
            functional_currency: 'USD',
            timezone: 'Asia/Phnom_Penh',
            status: 'active',
        },
        companies: [
            { id: 3, slug: 'acme-trading', name: 'Acme Trading Co.', status: 'active' },
        ],
        roles: ['accountant'],
        permissions: [
            'accounting.journal_entry.view',
            'accounting.journal_entry.create',
        ],
        entitled_modules: ['hrm'],
    },
};

// Companion fixture for super_admin /auth/me. The backend returns
// tenant: null + current_company: null + empty companies/roles/
// permissions/entitled_modules for SA.
const ME_SA: AuthMeResponse = {
    data: {
        user: {
            id: 99,
            name: 'Vendor Ops',
            email: 'ops@myerp.local',
            email_verified_at: '2026-06-01T08:00:00+00:00',
            type: 'super_admin',
            is_super_admin: true,
        },
        tenant: null,
        current_company: null,
        companies: [],
        roles: [],
        permissions: [],
        entitled_modules: [],
    },
};

function buildAxios401(errorCode?: string) {
    return Object.assign(new Error('401'), {
        isAxiosError: true,
        response: {
            status: 401,
            data: { message: 'Unauthenticated', error_code: errorCode },
        },
    });
}

describe('useAuthStore (real)', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('login then fetchMe populates user/tenant/roles/permissions', async () => {
        // ME_OK.data.tenant is typed nullable on AuthMeResponse (SA case);
        // LoginResponse.data.tenant is non-null because login is only
        // reached by tenant_users. Narrow with non-null assertion for
        // this fixture which is guaranteed tenant-shaped.
        const loginSpy = vi.spyOn(authApi, 'login').mockResolvedValue({
            data: { user: ME_OK.data.user, tenant: ME_OK.data.tenant! },
        });
        const meSpy = vi.spyOn(authApi, 'me').mockResolvedValue(ME_OK);

        const auth = useAuthStore();
        await auth.login({ email: 'jane@acme.example', password: 'secret' });

        expect(loginSpy).toHaveBeenCalledOnce();
        expect(meSpy).toHaveBeenCalledOnce();
        expect(auth.user?.id).toBe(42);
        expect(auth.tenant?.slug).toBe('acme');
        expect(auth.roles).toEqual(['accountant']);
        expect(auth.permissions).toHaveLength(2);
        expect(auth.isAuthenticated).toBe(true);
        expect(auth.tenantInactive).toBe(false);
    });

    it('fetchMe 401 (no error_code) resets state and leaves tenantInactive=false', async () => {
        vi.spyOn(authApi, 'me').mockRejectedValue(buildAxios401());

        const auth = useAuthStore();
        // Seed some state so we can observe the reset.
        auth.$patch({ permissions: ['stale'], roles: ['stale'] });

        await auth.fetchMe();

        expect(auth.user).toBeNull();
        expect(auth.permissions).toEqual([]);
        expect(auth.roles).toEqual([]);
        expect(auth.tenantInactive).toBe(false);
        expect(auth.isAuthenticated).toBe(false);
    });

    it('fetchMe 401 with error_code=tenant_inactive sets tenantInactive=true', async () => {
        vi.spyOn(authApi, 'me').mockRejectedValue(buildAxios401('tenant_inactive'));

        const auth = useAuthStore();
        await auth.fetchMe();

        expect(auth.tenantInactive).toBe(true);
        // tenantInactive blocks isAuthenticated regardless of user state.
        expect(auth.isAuthenticated).toBe(false);
    });

    it('logout calls the API and $resets state even when the call fails', async () => {
        const logoutSpy = vi
            .spyOn(authApi, 'logout')
            .mockRejectedValue(new Error('network down'));

        const auth = useAuthStore();
        auth.$patch({
            user: ME_OK.data.user,
            tenant: ME_OK.data.tenant,
            permissions: ME_OK.data.permissions,
        });
        expect(auth.user).not.toBeNull();

        await auth.logout();

        expect(logoutSpy).toHaveBeenCalledOnce();
        expect(auth.user).toBeNull();
        expect(auth.tenant).toBeNull();
        expect(auth.permissions).toEqual([]);
    });

    it('can(permission) matches exact permission names', () => {
        const auth = useAuthStore();
        auth.$patch({
            permissions: ['accounting.journal_entry.view'],
        });

        expect(auth.can('accounting.journal_entry.view')).toBe(true);
        expect(auth.can('accounting.journal_entry.create')).toBe(false);
        expect(auth.can('accounting')).toBe(false); // not a prefix match
    });

    it('canAny(prefix) matches any permission with the prefix', () => {
        const auth = useAuthStore();
        auth.$patch({
            permissions: [
                'accounting.journal_entry.view',
                'hrm.employee.view',
            ],
        });

        expect(auth.canAny('accounting')).toBe(true);
        expect(auth.canAny('hrm')).toBe(true);
        expect(auth.canAny('inventory')).toBe(false);
        // Exact equality also counts.
        auth.$patch({ permissions: ['accounting'] });
        expect(auth.canAny('accounting')).toBe(true);
    });

    // ─── Session 5 — SA-side extensions ──────────────────────────────────────

    it('isSuperAdmin getter reflects user.is_super_admin', () => {
        const auth = useAuthStore();
        expect(auth.isSuperAdmin).toBe(false); // no user

        // structuredClone keeps the module-scoped ME_OK / ME_SA fixtures
        // safe from Pinia's reactive-wrap mutations leaking across
        // tests within the same file run.
        auth.$patch({ user: structuredClone(ME_OK.data.user) });
        expect(auth.isSuperAdmin).toBe(false); // tenant_user

        auth.$patch({ user: structuredClone(ME_SA.data.user) });
        expect(auth.isSuperAdmin).toBe(true); // super_admin
    });

    it('fetchMe populates entitled_modules from the response (tenant_user)', async () => {
        vi.spyOn(authApi, 'me').mockResolvedValue(structuredClone(ME_OK));

        const auth = useAuthStore();
        await auth.fetchMe();

        expect(auth.entitledModules).toEqual(['hrm']);
        expect(auth.isSuperAdmin).toBe(false);
        // Regression: existing state still populated correctly with
        // the extended response shape (the new `entitled_modules`
        // field didn't break the older keys).
        expect(auth.user?.id).toBe(42);
        expect(auth.tenant?.slug).toBe('acme');
        expect(auth.permissions).toHaveLength(2);
        expect(auth.roles).toEqual(['accountant']);
    });

    it('fetchMe handles the SA shape — null tenant + empty arrays + isSuperAdmin true', async () => {
        vi.spyOn(authApi, 'me').mockResolvedValue(structuredClone(ME_SA));

        const auth = useAuthStore();
        await auth.fetchMe();

        expect(auth.user?.id).toBe(99);
        expect(auth.tenant).toBeNull();
        expect(auth.currentCompany).toBeNull();
        expect(auth.companies).toEqual([]);
        expect(auth.roles).toEqual([]);
        expect(auth.permissions).toEqual([]);
        expect(auth.entitledModules).toEqual([]);
        expect(auth.isSuperAdmin).toBe(true);
        expect(auth.isAuthenticated).toBe(true);
    });
});
