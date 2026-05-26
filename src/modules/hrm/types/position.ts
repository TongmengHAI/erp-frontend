// ─────────────────────────────────────────────────────────────────────────────
// Position types — mirror backend/docs/api/v1/hrm.md exactly.
//
// Source of truth is the backend contract. Mirror of department.ts —
// Position is a department-agnostic role label (Senior Accountant,
// Operations Manager) that an Employee holds via the structured
// employees.position_id FK. Replaces the free-text employees.job_title
// column that existed before the Positions slice.
// ─────────────────────────────────────────────────────────────────────────────

import type { PaginationLinks, PaginationMeta } from '@/modules/hrm/types/employee';

/**
 * Position lifecycle status. Mirrors backend PositionStatus enum.
 *
 *   active   — currently a valid role employees can be assigned to
 *   archived — historical; no new assignments expected
 */
export type PositionStatus = 'active' | 'archived';

export const POSITION_STATUSES: readonly PositionStatus[] = Object.freeze([
    'active',
    'archived',
]);

/**
 * Compact Position shape — used in list (index) responses. Drops
 * `description`, `employees_count`, and timestamps for payload
 * efficiency. Mirror of DepartmentBrief.
 */
export interface PositionBrief extends Record<string, unknown> {
    id: number;
    code: string;
    title: string;
    status: PositionStatus;
}

/**
 * Full Position shape — returned by show / store / update endpoints.
 *
 * employees_count is the load-bearing field for the detail page's
 * "Employees with this position" section. Pre-computed on the show
 * endpoint via withCount('employees'); the list (Brief) shape does
 * NOT include this — detail-page chrome only.
 */
export interface Position {
    id: number;
    code: string;
    title: string;
    description: string | null;
    status: PositionStatus;
    employees_count: number;
    /** ISO 8601 timestamp. */
    created_at: string;
    /** ISO 8601 timestamp. */
    updated_at: string;
}

/**
 * Query parameters for GET /api/v1/hrm/positions. All optional;
 * empty / undefined values stripped at the API client.
 */
export interface PositionListParams {
    search?: string;
    status?: PositionStatus;
    per_page?: number;
    page?: number;
}

export interface PositionListResponse {
    data: PositionBrief[];
    meta: PaginationMeta;
    links: PaginationLinks;
}

export interface PositionShowResponse {
    data: Position;
}

/**
 * Request body for POST /api/v1/hrm/positions. `tenant_id` and
 * `company_id` are absent — backend derives them from request context.
 */
export interface CreatePositionRequest {
    code: string;
    title: string;
    description?: string | null;
    status: PositionStatus;
}

/**
 * Request body for PATCH /api/v1/hrm/positions/{id}. All fields
 * optional — backend uses `sometimes` rules. Send only what changed.
 */
export type UpdatePositionRequest = Partial<CreatePositionRequest>;
