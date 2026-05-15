import { defineStore } from 'pinia';

import type { AuthTenant } from '@/modules/auth/types';

// ─────────────────────────────────────────────────────────────────────────────
// useTenantStore — mirrors the current tenant from useAuthStore.
//
// The authoritative tenant lives in useAuthStore.tenant (set by /auth/me).
// useAuthBootstrap installs a `watch(auth.tenant, ...)` that $patches this
// store. We keep the mirror so AppTopBar and future tenant-aware components
// can read `useTenantStore().current` directly without coupling to auth.
//
// No actions: this store is written to only by the bootstrap composable.
// No fetch* — there is no `/tenants/current` endpoint; tenant identity flows
// through /auth/me.
//
// Master decision 12: tenant is presented as static text in the top bar.
// No switcher UX is exposed; if a user needs to switch, that's an out-of-
// band concern deferred indefinitely.
// ─────────────────────────────────────────────────────────────────────────────

interface TenantState {
    current: AuthTenant | null;
}

export const useTenantStore = defineStore('tenant', {
    state: (): TenantState => ({
        current: null,
    }),
});
