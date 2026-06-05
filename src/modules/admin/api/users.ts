import { apiClient } from '@/shared/api/client';

import type {
    AdminInvitationResponse,
    AdminRoleOptionsResponse,
    AdminUserListResponse,
    AdminUserShowResponse,
    AdminUsersListParams,
    InviteUserRequest,
    UpdateAdminUserRequest,
} from '@/modules/admin/types/user';

// ─────────────────────────────────────────────────────────────────────────────
// Admin users API — typed wrappers over apiClient.
//
// Mirrors backend/docs/api/v1/admin.md (Phase 2A user management):
//   GET   /api/v1/admin/users           → AdminUserListResponse (paginated)
//   GET   /api/v1/admin/users/{id}      → AdminUserShowResponse
//
// Session 3 covers read-only; Session 4 adds PATCH + the four lifecycle
// transitions (disable / enable / deactivate / restore). Session 5 covers
// the public invitation accept flow.
//
// Authorization model is at the controller level (AuthorizesUserManagement):
//   • Missing users.view → 404 (feature hide convention per §10.6)
//   • Cross-tenant target → 404 (User isn't tenant-scoped via global
//     scope; the cross-tenant guard fires at the controller)
//   • Other errors (401, 422) pass through to the page layer.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strip undefined / null / empty-string values from the params object.
 * Same discipline as employees.ts — see that file's docblock for the
 * full rationale (empty `?search=` would match `%%` and falsely surface
 * every row; empty `?status=` would 422 the request).
 */
function cleanParams(params: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        if (typeof value === 'string' && value === '') continue;
        out[key] = value;
    }
    return out;
}

export async function listAdminUsers(
    params: AdminUsersListParams = {},
): Promise<AdminUserListResponse> {
    const res = await apiClient.get<AdminUserListResponse>('/admin/users', {
        params: cleanParams(params as Record<string, unknown>),
    });
    return res.data;
}

export async function getAdminUser(id: number): Promise<AdminUserShowResponse> {
    const res = await apiClient.get<AdminUserShowResponse>(`/admin/users/${id}`);
    return res.data;
}

export async function listRoleOptions(): Promise<AdminRoleOptionsResponse> {
    const res = await apiClient.get<AdminRoleOptionsResponse>('/admin/users/role-options');
    return res.data;
}

export async function updateAdminUser(
    id: number,
    payload: UpdateAdminUserRequest,
): Promise<AdminUserShowResponse> {
    const res = await apiClient.patch<AdminUserShowResponse>(
        `/admin/users/${id}`,
        payload,
    );
    return res.data;
}

export async function inviteUser(
    payload: InviteUserRequest,
): Promise<AdminInvitationResponse> {
    const res = await apiClient.post<AdminInvitationResponse>(
        '/admin/users/invitations',
        payload,
    );
    return res.data;
}

// ─── Lifecycle transitions ─────────────────────────────────────────────────
// Each transition is its own endpoint (state-machine pattern, §10.2).
// All return the updated AdminUserShowResponse so the caller can
// hydrate the detail page without a refetch.

export async function disableAdminUser(id: number): Promise<AdminUserShowResponse> {
    const res = await apiClient.post<AdminUserShowResponse>(
        `/admin/users/${id}/disable`,
    );
    return res.data;
}

export async function enableAdminUser(id: number): Promise<AdminUserShowResponse> {
    const res = await apiClient.post<AdminUserShowResponse>(
        `/admin/users/${id}/enable`,
    );
    return res.data;
}

export async function deactivateAdminUser(id: number): Promise<AdminUserShowResponse> {
    const res = await apiClient.post<AdminUserShowResponse>(
        `/admin/users/${id}/deactivate`,
    );
    return res.data;
}

export async function restoreAdminUser(id: number): Promise<AdminUserShowResponse> {
    const res = await apiClient.post<AdminUserShowResponse>(
        `/admin/users/${id}/restore`,
    );
    return res.data;
}
