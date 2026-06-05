import { apiClient } from '@/shared/api/client';

import type {
    AdminUserListResponse,
    AdminUserShowResponse,
    AdminUsersListParams,
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
