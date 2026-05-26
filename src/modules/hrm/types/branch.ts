// ─────────────────────────────────────────────────────────────────────────────
// Branch types — mirror backend/docs/api/v1/hrm.md exactly.
//
// Source of truth is the backend contract. Branch is a physical office /
// warehouse location an Employee can be assigned to via the structured
// employees.branch_id FK. Third optional cross-module FK on Employee
// alongside department_id and position_id — no cutover (purely additive).
//
// Branch carries four location-specific fields the other HRM resources
// don't: address, city, country_code (ISO 3166-1 alpha-2), phone. These
// only appear on the Branch detail/form pages and on the wider snapshot
// embedded in the Employee detail row.
// ─────────────────────────────────────────────────────────────────────────────

import type { PaginationLinks, PaginationMeta } from '@/modules/hrm/types/employee';

/**
 * Branch lifecycle status. Mirrors backend BranchStatus enum.
 *
 *   active   — currently a valid location employees can be assigned to
 *   archived — historical; no new assignments expected
 */
export type BranchStatus = 'active' | 'archived';

export const BRANCH_STATUSES: readonly BranchStatus[] = Object.freeze([
    'active',
    'archived',
]);

/**
 * Compact Branch shape — used in list (index) responses. Drops
 * description, employees_count, address, country_code, phone, and
 * timestamps for payload efficiency. City IS included because it's
 * the natural locator on a list view of physical locations.
 */
export interface BranchBrief extends Record<string, unknown> {
    id: number;
    code: string;
    name: string;
    city: string | null;
    status: BranchStatus;
}

/**
 * Full Branch shape — returned by show / store / update endpoints.
 * Drives the detail page and the form's edit-mode initial values.
 *
 * employees_count is the load-bearing field for the detail page's
 * "Employees at this branch" section. Pre-computed on the show
 * endpoint via withCount('employees'); the list (Brief) shape does
 * NOT include this — detail-page chrome only.
 */
export interface Branch {
    id: number;
    code: string;
    name: string;
    description: string | null;
    address: string | null;
    city: string | null;
    /** ISO 3166-1 alpha-2 country code (e.g. 'KH'). Always uppercase
     *  when present — the backend's FormRequest regex /^[A-Z]{2}$/
     *  rejects lowercase. */
    country_code: string | null;
    phone: string | null;
    status: BranchStatus;
    employees_count: number;
    /** ISO 8601 timestamp. */
    created_at: string;
    /** ISO 8601 timestamp. */
    updated_at: string;
}

/**
 * Query parameters for GET /api/v1/hrm/branches. All optional;
 * empty / undefined values stripped at the API client.
 */
export interface BranchListParams {
    /** Case-insensitive ILIKE search across name, code, and city. */
    search?: string;
    status?: BranchStatus;
    per_page?: number;
    page?: number;
}

export interface BranchListResponse {
    data: BranchBrief[];
    meta: PaginationMeta;
    links: PaginationLinks;
}

export interface BranchShowResponse {
    data: Branch;
}

/**
 * Request body for POST /api/v1/hrm/branches. `tenant_id` and
 * `company_id` are absent — backend derives them from request context.
 *
 * country_code is validated server-side as /^[A-Z]{2}$/ — only
 * uppercase ISO 3166-1 alpha-2 codes pass. The form's setErrors path
 * surfaces a lowercase/invalid value back to the field inline.
 */
export interface CreateBranchRequest {
    code: string;
    name: string;
    description?: string | null;
    address?: string | null;
    city?: string | null;
    country_code?: string | null;
    phone?: string | null;
    status: BranchStatus;
}

/**
 * Request body for PATCH /api/v1/hrm/branches/{id}. All fields
 * optional — backend uses `sometimes` rules. Send only what changed.
 */
export type UpdateBranchRequest = Partial<CreateBranchRequest>;
