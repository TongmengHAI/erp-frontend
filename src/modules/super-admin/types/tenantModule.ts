// ─────────────────────────────────────────────────────────────────────────────
// TenantModule types — mirror backend TenantModuleResource (Session 2).
//
// Per §10.3 read-side discipline: the entitlement state lives behind
// the SA-side endpoints. The editor page consumes the index endpoint
// for read + the sync endpoint for write.
// ─────────────────────────────────────────────────────────────────────────────

export type ModuleStatus = 'active' | 'disabled';

export const MODULE_STATUSES: readonly ModuleStatus[] = Object.freeze([
    'active',
    'disabled',
]);

/**
 * Known module keys — must match the backend's KNOWN_MODULES allowlist
 * in EnforceModuleEntitlement + the SyncTenantModulesRequest's Rule::in
 * list. Drift = a 422 path the SPA can't surface.
 *
 * v1 ships HRM as the only entitlement-gated module; future modules
 * (accounting, inventory) extend this list AND the backend allowlist
 * AND the LAUNCHER_APPS registry — all three sources must stay in sync.
 */
export const KNOWN_MODULE_KEYS: readonly string[] = Object.freeze(['hrm']);

export interface TenantModule {
    id: number;
    tenant_id: number;
    module_key: string;
    status: ModuleStatus;
    enabled_at: string | null;
    enabled_by_user_id: number | null;
    created_at: string;
    updated_at: string;
}

export interface TenantModuleIndexResponse {
    data: TenantModule[];
}

export interface SyncTenantModulesRequest {
    modules: Array<{
        module_key: string;
        status: ModuleStatus;
    }>;
}

export type SyncTenantModulesResponse = TenantModuleIndexResponse;
