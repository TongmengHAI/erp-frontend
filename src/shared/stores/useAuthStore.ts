import axios from 'axios';
import { defineStore } from 'pinia';

import * as authApi from '@/modules/auth/api/auth';
import type {
    ApiErrorBody,
    AuthCompany,
    AuthCompanyBrief,
    AuthTenant,
    AuthUser,
    LoginRequest,
} from '@/modules/auth/types';
import { resetCsrfReady } from '@/shared/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// useAuthStore — authenticated session state.
//
// Sourced from /api/v1/auth/me. Holds user + tenant + roles + permissions
// per the contract in backend/docs/api/v1/auth.md. The tenant lives here
// (single source of truth) and is mirrored into useTenantStore by the
// `useAuthBootstrap` composable's watch — no store-to-store imports.
//
// Two notable flags in state:
//   - initialized: bootstrap has completed (success OR failure). The router
//     reads this so it can hold the first navigation until /me has resolved.
//   - tenantInactive: /me returned 401 with error_code='tenant_inactive'.
//     The route guard routes to /tenant-suspended instead of /login.
// ─────────────────────────────────────────────────────────────────────────────

interface AuthState {
    user: AuthUser | null;
    tenant: AuthTenant | null;
    /** The resolved company for this session, or null on a company:optional
     *  route where the user hasn't picked yet. Mirrors /auth/me.current_company. */
    currentCompany: AuthCompany | null;
    /** All active companies in the user's tenant. Drives the company picker
     *  on multi-company surfaces (admin Settings, future tenant switcher). */
    companies: AuthCompanyBrief[];
    roles: string[];
    permissions: string[];
    /** Active module entitlement keys for this tenant (Session 5 of the
     *  SA Portal slice). Drives the launcher's per-tenant filter. Empty
     *  for SA — the SA's launcher view uses the orthogonal `superAdminOnly`
     *  LAUNCHER_APPS field. */
    entitledModules: string[];
    tenantInactive: boolean;
    initialized: boolean;
}

function isAxiosError(e: unknown): e is import('axios').AxiosError<ApiErrorBody> {
    return axios.isAxiosError(e);
}

export const useAuthStore = defineStore('auth', {
    state: (): AuthState => ({
        user: null,
        tenant: null,
        currentCompany: null,
        companies: [],
        roles: [],
        permissions: [],
        entitledModules: [],
        tenantInactive: false,
        initialized: false,
    }),

    getters: {
        isAuthenticated: (state): boolean =>
            state.user !== null && !state.tenantInactive,
        /**
         * SA gate — the canonical "is this user a super-admin" check.
         * Single source of truth consumed by route guards, the launcher
         * filter, the AppSwitcherDropdown filter, getDefaultRoute, the
         * UserMenu's Super Admin link, and the SuperAdminAppLayout's
         * own access check. Five sites — same belt-and-suspenders
         * discipline as the backend's five user-type bypass sites
         * (TenantScope, CompanyScope, ResolveTenant, ResolveCompany,
         * EnforceModuleEntitlement).
         */
        isSuperAdmin: (state): boolean =>
            state.user?.is_super_admin ?? false,
        /**
         * Exact-match permission check. `permission` is the canonical
         * dotted name (e.g. `'accounting.journal_entry.view'`).
         */
        can:
            (state) =>
            (permission: string): boolean =>
                state.permissions.includes(permission),
        /**
         * Prefix match for module-visibility gates. `canAny('accounting')`
         * returns true if the user has ANY permission starting with
         * `'accounting.'` or equal to `'accounting'`.
         *
         * Use this for sidebar/nav gates where "can see Accounting" is
         * semantically different from "can perform accounting.X.Y action".
         */
        canAny:
            (state) =>
            (prefix: string): boolean =>
                state.permissions.some(
                    (p) => p === prefix || p.startsWith(`${prefix}.`),
                ),
    },

    actions: {
        async login(payload: LoginRequest): Promise<void> {
            await authApi.login(payload);
            // /login returns user + tenant but NOT permissions. Always
            // follow with /me to populate the can() set.
            await this.fetchMe();
        },

        async fetchMe(): Promise<void> {
            try {
                const res = await authApi.me();
                this.$patch({
                    user: res.data.user,
                    tenant: res.data.tenant,
                    currentCompany: res.data.current_company,
                    companies: res.data.companies,
                    roles: res.data.roles,
                    permissions: res.data.permissions,
                    entitledModules: res.data.entitled_modules,
                    tenantInactive: false,
                });
            } catch (e) {
                if (isAxiosError(e) && e.response?.status === 401) {
                    const code = e.response.data?.error_code;
                    if (code === 'tenant_inactive') {
                        // User authenticated but tenant suspended — route
                        // guard sends them to /tenant-suspended.
                        this.$reset();
                        this.tenantInactive = true;
                        return;
                    }
                    // Session missing/expired/invalid — fully reset.
                    this.$reset();
                    return;
                }
                // Anything else (network, 5xx) — bubble up so callers can
                // surface or retry. Bootstrap swallows; pages handle.
                throw e;
            }
        },

        async logout(): Promise<void> {
            try {
                await authApi.logout();
            } catch {
                // Swallow — local reset still happens. A failed network
                // call shouldn't trap the user in an authenticated state.
            }
            resetCsrfReady();
            this.$reset();
        },
    },
});
