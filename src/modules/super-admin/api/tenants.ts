import { apiClient } from '@/shared/api/client';

import type {
    CreateTenantRequest,
    CreateTenantResponse,
    TenantListParams,
    TenantListResponse,
    TenantShowResponse,
    UpdateTenantRequest,
    UpdateTenantResponse,
} from '@/modules/super-admin/types/tenant';

// ─────────────────────────────────────────────────────────────────────────────
// Tenants API — typed wrappers over apiClient. Mirrors the SA-side
// endpoints from Session 3:
//
//   GET    /api/v1/super-admin/tenants          → list (paginated)
//   GET    /api/v1/super-admin/tenants/{id}     → show
//   POST   /api/v1/super-admin/tenants          → create (returns one-time pw)
//   PATCH  /api/v1/super-admin/tenants/{id}     → update profile + status
// ─────────────────────────────────────────────────────────────────────────────

function cleanParams(params: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        if (typeof value === 'string' && value === '') continue;
        out[key] = value;
    }
    return out;
}

export async function listTenants(params: TenantListParams = {}): Promise<TenantListResponse> {
    const res = await apiClient.get<TenantListResponse>('/super-admin/tenants', {
        params: cleanParams(params as Record<string, unknown>),
    });
    return res.data;
}

export async function getTenant(id: number): Promise<TenantShowResponse> {
    const res = await apiClient.get<TenantShowResponse>(`/super-admin/tenants/${id}`);
    return res.data;
}

export async function createTenant(payload: CreateTenantRequest): Promise<CreateTenantResponse> {
    const res = await apiClient.post<CreateTenantResponse>('/super-admin/tenants', payload);
    return res.data;
}

export async function updateTenant(
    id: number,
    payload: UpdateTenantRequest,
): Promise<UpdateTenantResponse> {
    const res = await apiClient.patch<UpdateTenantResponse>(`/super-admin/tenants/${id}`, payload);
    return res.data;
}
