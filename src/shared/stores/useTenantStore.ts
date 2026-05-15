import { defineStore } from 'pinia';

// ─────────────────────────────────────────────────────────────────────────────
// useTenantStore — STUB for F2c.
//
// Surfaces the minimal contract AppTopBar needs:
//   - state.current: null | Tenant
//
// F3 replaces the body with:
//   - fetchCurrent()  → GET /api/v1/tenants/current (resolves on bootstrap)
//
// Master decision 12: there is no tenant switcher in the UI. The top bar
// renders the current tenant's name as static text. If a user belongs to
// multiple tenants, switching happens elsewhere (out of scope indefinitely).
// ─────────────────────────────────────────────────────────────────────────────

export interface Tenant {
    id: string;
    name: string;
}

interface TenantState {
    current: Tenant | null;
}

export const useTenantStore = defineStore('tenant', {
    state: (): TenantState => ({
        current: null,
    }),
});
