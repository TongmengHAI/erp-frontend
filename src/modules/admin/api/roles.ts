import { apiClient } from '@/shared/api/client';

import type {
    AdminRoleListResponse,
    AdminRoleShowResponse,
    AdminRolesListParams,
    CreateRoleRequest,
    RoleImpactResponse,
    UpdateRoleRequest,
} from '@/modules/admin/types/role';

// ─────────────────────────────────────────────────────────────────────────────
// Admin roles API — typed wrappers over apiClient.
//
// Mirrors backend Phase 2B Session 2:
//   GET    /api/v1/admin/roles                → AdminRoleListResponse
//   GET    /api/v1/admin/roles/{id}           → AdminRoleShowResponse
//   POST   /api/v1/admin/roles                → AdminRoleShowResponse (201)
//   PATCH  /api/v1/admin/roles/{id}           → AdminRoleShowResponse
//   DELETE /api/v1/admin/roles/{id}           → 204 no content
//   GET    /api/v1/admin/roles/{id}/impact    → RoleImpactResponse
//
// Session 3 covers the read paths (list + detail) + delete for the
// detail page's delete affordance. Session 4 adds create/update + the
// impact endpoint.
//
// Authorization model (controller layer):
//   • Missing roles.view  → 404 (feature-hide per §10.6)
//   • Missing action perm → 403 (roles.create / .update / .delete)
//   • Cross-tenant target → 404 (AuthorizesRoleManagement)
//   • System role mutation → 403 error_code='system_role_immutable'
//   • Custom role delete with users assigned → 422 error_code='role_in_use'
//     + users_count
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

export async function listAdminRoles(
    params: AdminRolesListParams = {},
): Promise<AdminRoleListResponse> {
    const res = await apiClient.get<AdminRoleListResponse>('/admin/roles', {
        params: cleanParams(params as Record<string, unknown>),
    });
    return res.data;
}

export async function getAdminRole(id: number): Promise<AdminRoleShowResponse> {
    const res = await apiClient.get<AdminRoleShowResponse>(`/admin/roles/${id}`);
    return res.data;
}

export async function createAdminRole(
    payload: CreateRoleRequest,
): Promise<AdminRoleShowResponse> {
    const res = await apiClient.post<AdminRoleShowResponse>('/admin/roles', payload);
    return res.data;
}

export async function updateAdminRole(
    id: number,
    payload: UpdateRoleRequest,
): Promise<AdminRoleShowResponse> {
    const res = await apiClient.patch<AdminRoleShowResponse>(
        `/admin/roles/${id}`,
        payload,
    );
    return res.data;
}

export async function deleteAdminRole(id: number): Promise<void> {
    await apiClient.delete(`/admin/roles/${id}`);
}

export async function getRoleImpact(
    id: number,
    removedPermissions: string[],
): Promise<RoleImpactResponse> {
    const res = await apiClient.get<RoleImpactResponse>(
        `/admin/roles/${id}/impact`,
        {
            params: { removed_permissions: removedPermissions },
        },
    );
    return res.data;
}
