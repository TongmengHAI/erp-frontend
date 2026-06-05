// ─────────────────────────────────────────────────────────────────────────────
// Admin user types — mirror backend/docs/api/v1/admin.md (Phase 2A
// invitation + lifecycle endpoints).
//
// Source of truth is the backend contract (AdminUserResource +
// AdminUserBriefResource in app/Web/API/V1/Resources/Admin/). Drift = bug.
// ─────────────────────────────────────────────────────────────────────────────

import type { PaginationLinks, PaginationMeta } from '@/modules/hrm/types/employee';

/**
 * User lifecycle status. Mirrors the backend UserStatus enum string values.
 *
 *   active   — can authenticate; normal operational state
 *   inactive — soft-blocked; cannot log in; reversible via Enable
 *
 * Note this is ORTHOGONAL to soft-delete (deleted_at). A user can be:
 *   • active  + not-deleted     → fully operational
 *   • inactive + not-deleted    → soft-blocked
 *   • active + soft-deleted     → deactivated (status irrelevant; deleted_at gates login)
 *   • inactive + soft-deleted   → deactivated (same effective state)
 *
 * The list page's "Deactivated" filter surfaces deleted_at !== null
 * regardless of status. See is_deactivated below.
 */
export type UserStatus = 'active' | 'inactive';

/**
 * Frozen allowlist for useUrlEnumFilter('status', USER_STATUSES) per
 * CLAUDE.md §10.8. The allowlist is the LOAD-BEARING defence against
 * deep-link URL forgery — any ?status= value not in this set falls
 * back to null at the composable layer, so an attacker can't inject
 * arbitrary string values into page state via the URL.
 *
 * Frozen at module scope so the registry can't be mutated at runtime.
 * The co-located spec asserts Object.isFrozen() is true (mirrors the
 * TENANT_STATUSES discipline shipped in Stage 4).
 */
export const USER_STATUSES: readonly UserStatus[] = Object.freeze([
    'active',
    'inactive',
]);

/**
 * Lifecycle filter values surfaced as a chip on the admin list page.
 *
 *   active        — status=active AND deleted_at IS NULL
 *   inactive      — status=inactive AND deleted_at IS NULL
 *   deactivated   — deleted_at IS NOT NULL (status irrelevant)
 *
 * 'deactivated' is NOT a UserStatus enum value — it's a SUPERSET filter
 * that translates to `include_deactivated=true` + a client-side filter,
 * OR a dedicated backend filter (currently the former).
 */
export type UserLifecycleFilter = UserStatus | 'deactivated';

export const USER_LIFECYCLE_FILTERS: readonly UserLifecycleFilter[] = Object.freeze([
    'active',
    'inactive',
    'deactivated',
]);

/**
 * Brief user payload for /api/v1/admin/users (list). Mirrors
 * AdminUserBriefResource exactly.
 */
export interface AdminUserBrief extends Record<string, unknown> {
    id: number;
    name: string;
    email: string;
    status: UserStatus;
    is_active: boolean;
    is_deactivated: boolean;
    role_name: string | null;
    created_at: string;
}

/**
 * Full user payload for /api/v1/admin/users/{id} (detail). Mirrors
 * AdminUserResource exactly.
 */
export interface AdminUser {
    id: number;
    name: string;
    email: string;
    /** ISO 8601 or null. */
    email_verified_at: string | null;
    type: 'tenant_user' | 'super_admin';
    status: UserStatus;
    is_super_admin: boolean;
    is_active: boolean;
    is_deactivated: boolean;
    /** ISO 8601 if deactivated, else null. */
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
    role: { id: number; name: string } | null;
}

/**
 * Query params for GET /api/v1/admin/users. Aligned with the backend
 * IndexUsersRequest fields. `lifecycle` is preferred over status +
 * include_deactivated and takes precedence when set.
 */
export interface AdminUsersListParams {
    /**
     * UI-aligned lifecycle filter. Matches USER_LIFECYCLE_FILTERS.
     *   active       → status=active AND not deactivated
     *   inactive     → status=inactive AND not deactivated
     *   deactivated  → deleted_at IS NOT NULL (status irrelevant)
     */
    lifecycle?: UserLifecycleFilter;
    /** Legacy. Use `lifecycle` for new callers. */
    status?: UserStatus;
    /** Legacy. Use `lifecycle=deactivated` for the only-deactivated case. */
    include_deactivated?: boolean;
    search?: string;
    role_id?: number;
    per_page?: number;
    page?: number;
}

export interface AdminUserListResponse {
    data: AdminUserBrief[];
    meta: PaginationMeta;
    links: PaginationLinks;
}

export interface AdminUserShowResponse {
    data: AdminUser;
}

/**
 * Role option returned by GET /admin/users/role-options. Populates
 * the role Select in the invite + edit forms.
 */
export interface AdminRoleOption {
    id: number;
    name: string;
}

export interface AdminRoleOptionsResponse {
    data: AdminRoleOption[];
}

/**
 * Request body for POST /admin/users/invitations (Phase 2A invite).
 * Empty `name` is allowed (the invitee can set it during accept).
 */
export interface InviteUserRequest {
    email: string;
    name?: string | null;
    role_id: number;
}

/**
 * Response from POST /admin/users/invitations — wraps the persisted
 * Invitation row. The raw token is NEVER returned to the caller; it
 * ships only via the UserInvited event into the queued listener.
 */
export interface AdminInvitation {
    id: number;
    email: string;
    name: string | null;
    role_id: number;
    status: 'pending' | 'accepted' | 'cancelled' | 'expired';
    expires_at: string;
    accepted_at: string | null;
    cancelled_at: string | null;
    created_at: string;
    invited_by_user_id: number;
}

export interface AdminInvitationResponse {
    data: AdminInvitation;
}

/**
 * Request body for PATCH /admin/users/{id} — name + role only.
 * Status transitions go through dedicated /disable, /enable,
 * /deactivate, /restore endpoints per CLAUDE.md §10.2.
 */
export interface UpdateAdminUserRequest {
    name?: string;
    role_id?: number;
}
