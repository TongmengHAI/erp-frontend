// ─────────────────────────────────────────────────────────────────────────────
// Department types — mirror backend/docs/api/v1/hrm.md exactly.
//
// Source of truth is the backend contract. Any drift here is a bug. If a
// field shape changes upstream, update both this file and the consuming
// callsites in a single slice.
// ─────────────────────────────────────────────────────────────────────────────

import type { PaginationLinks, PaginationMeta } from '@/modules/hrm/types/employee';

/**
 * Department lifecycle status. Mirrors backend DepartmentStatus enum
 * string values.
 *
 *   active   — operational
 *   archived — retired; preserved for historical reference
 */
export type DepartmentStatus = 'active' | 'archived';

export const DEPARTMENT_STATUSES: readonly DepartmentStatus[] = Object.freeze([
    'active',
    'archived',
]);

/**
 * Compact Department shape — used in list (index) responses. Drops
 * `description` (the list table doesn't render it; detail page shows it)
 * and the timestamp pair (no "last edited" column).
 */
export interface DepartmentBrief extends Record<string, unknown> {
    id: number;
    code: string;
    name: string;
    status: DepartmentStatus;
}

/**
 * Full Department shape — returned by show / store / update endpoints.
 */
export interface Department {
    id: number;
    code: string;
    name: string;
    description: string | null;
    status: DepartmentStatus;
    /** ISO 8601 timestamp. */
    created_at: string;
    /** ISO 8601 timestamp. */
    updated_at: string;
}

/**
 * Query parameters accepted by GET /api/v1/hrm/departments. All optional.
 * Empty / undefined values are omitted from the request — the API client
 * builds the URL accordingly.
 */
export interface DepartmentListParams {
    search?: string;
    status?: DepartmentStatus;
    /** 1–100, default 25 on the backend. */
    per_page?: number;
    /** 1-indexed, default 1. */
    page?: number;
}

export interface DepartmentListResponse {
    data: DepartmentBrief[];
    meta: PaginationMeta;
    links: PaginationLinks;
}

export interface DepartmentShowResponse {
    data: Department;
}

/**
 * Request body for POST /api/v1/hrm/departments. `tenant_id` and
 * `company_id` are absent — backend derives them from the request context.
 */
export interface CreateDepartmentRequest {
    code: string;
    name: string;
    description?: string | null;
    status: DepartmentStatus;
}

/**
 * Request body for PATCH. All fields optional — `sometimes` rules on the
 * backend. Send only what changed.
 */
export type UpdateDepartmentRequest = Partial<CreateDepartmentRequest>;
