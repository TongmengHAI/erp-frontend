import { apiClient } from '@/shared/api/client';

import type {
    SyncTenantModulesRequest,
    SyncTenantModulesResponse,
    TenantModuleIndexResponse,
} from '@/modules/super-admin/types/tenantModule';

// ─────────────────────────────────────────────────────────────────────────────
// Tenant modules API — typed wrappers over apiClient.
//
// Endpoints (backend Session 2):
//   GET   /api/v1/super-admin/tenants/{id}/modules → TenantModuleIndexResponse
//   PATCH /api/v1/super-admin/tenants/{id}/modules → SyncTenantModulesResponse
// ─────────────────────────────────────────────────────────────────────────────

export async function listTenantModules(tenantId: number): Promise<TenantModuleIndexResponse> {
    const res = await apiClient.get<TenantModuleIndexResponse>(
        `/super-admin/tenants/${tenantId}/modules`,
    );
    return res.data;
}

export async function syncTenantModules(
    tenantId: number,
    payload: SyncTenantModulesRequest,
): Promise<SyncTenantModulesResponse> {
    const res = await apiClient.patch<SyncTenantModulesResponse>(
        `/super-admin/tenants/${tenantId}/modules`,
        payload,
    );
    return res.data;
}
