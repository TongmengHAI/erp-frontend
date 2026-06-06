// ─────────────────────────────────────────────────────────────────────────────
// Admin role types — mirror backend Phase 2B Session 2:
//   - app/Web/API/V1/Resources/Admin/AdminRoleResource.php
//   - app/Web/API/V1/Resources/Admin/AdminRoleBriefResource.php
//
// Source of truth is the backend. Drift = bug.
// ─────────────────────────────────────────────────────────────────────────────

import type { PaginationLinks, PaginationMeta } from '@/modules/hrm/types/employee';

/**
 * Role-list kind filter values. The list page surfaces BOTH system and
 * custom rows by default; the chip lets admins narrow to one bucket.
 *
 *   system  — is_system=true (tenant_admin, accountant, viewer)
 *   custom  — is_system=false (tenant-scoped admin-created roles)
 */
export type RoleKindFilter = 'system' | 'custom';

/**
 * Frozen allowlist for useUrlEnumFilter('kind', ROLE_KIND_FILTERS) per
 * CLAUDE.md §10.8. The allowlist is the LOAD-BEARING defence against
 * deep-link URL forgery — any ?kind= value not in this set falls back
 * to null at the composable layer.
 *
 * Frozen at module scope; the co-located spec asserts Object.isFrozen()
 * is true plus push/splice rejection (same shape as TENANT_STATUSES and
 * USER_STATUSES / USER_LIFECYCLE_FILTERS).
 */
export const ROLE_KIND_FILTERS: readonly RoleKindFilter[] = Object.freeze([
    'system',
    'custom',
]);

/**
 * Brief role payload for /api/v1/admin/roles (list). Mirrors
 * AdminRoleBriefResource exactly.
 *
 *   label — i18n-rendered display label for system rows; raw `name`
 *           for custom rows. The backend handles the translation pass;
 *           the SPA renders verbatim.
 */
export interface AdminRoleBrief extends Record<string, unknown> {
    id: number;
    name: string;
    label: string;
    is_system: boolean;
    is_custom: boolean;
    users_count: number;
    created_at: string;
}

/**
 * A permission row as it appears on the role detail payload. The SPA's
 * PermissionList component groups these by domain (the first segment
 * of `name`) and renders descriptions from the
 * /api/v1/permissions/descriptions catalog.
 */
export interface AdminRolePermission {
    id: number;
    name: string;
}

/**
 * Full role payload for /api/v1/admin/roles/{id} (detail) +
 * create/update responses. Mirrors AdminRoleResource exactly.
 */
export interface AdminRole {
    id: number;
    name: string;
    description: string | null;
    label: string;
    is_system: boolean;
    is_custom: boolean;
    team_id: number | null;
    is_deleted: boolean;
    /** Present on detail responses; absent on the list endpoint. */
    permissions?: AdminRolePermission[];
    users_count: number;
    created_at: string;
    updated_at: string;
}

/**
 * Query params for GET /api/v1/admin/roles. Aligned with the backend
 * IndexRolesRequest fields.
 */
export interface AdminRolesListParams {
    kind?: RoleKindFilter;
    search?: string;
    per_page?: number;
    page?: number;
}

export interface AdminRoleListResponse {
    data: AdminRoleBrief[];
    meta: PaginationMeta;
    links: PaginationLinks;
}

export interface AdminRoleShowResponse {
    data: AdminRole;
}

/**
 * Request bodies for the role mutation endpoints. Custom-role-only —
 * system rows reject mutation with 403 + error_code='system_role_immutable'.
 */
export interface CreateRoleRequest {
    name: string;
    description?: string | null;
    permission_ids: number[];
}

export interface UpdateRoleRequest {
    name?: string;
    description?: string | null;
    permission_ids?: number[];
}

/**
 * Response from GET /api/v1/admin/roles/{role}/impact — the over-warn
 * user impact preview the RoleUpdateWarning dialog reads (Session 4).
 * affected_users_count may over-report by design (see backend
 * RoleImpactController docblock).
 */
export interface RoleImpactResponse {
    data: {
        affected_users_count: number;
        affected_users_preview: Array<{ id: number; name: string }>;
    };
}

/**
 * Response shape from the RoleInUseException (422). The FE's
 * RoleDeleteConfirm component reads users_count to render the
 * actionable error copy.
 */
export interface RoleInUseErrorBody {
    message: string;
    error_code: 'role_in_use';
    users_count: number;
}

/**
 * Response shape from the RoleImmutableException (403). Surfaces on
 * mutation attempts against system roles.
 */
export interface RoleImmutableErrorBody {
    message: string;
    error_code: 'system_role_immutable';
    action: 'update' | 'delete';
}
