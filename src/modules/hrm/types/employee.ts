// ─────────────────────────────────────────────────────────────────────────────
// Employee types — mirror backend/docs/api/v1/hrm.md exactly.
//
// Source of truth is the backend contract. Any drift here is a bug. If a
// field shape changes upstream, update both this file and the consuming
// callsites in a single slice.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Employment status. Mirrors backend EmployeeStatus enum string values.
 *
 *   active     — currently employed
 *   on_leave   — temporarily away (parental, medical, sabbatical)
 *   terminated — no longer employed
 */
export type EmployeeStatus = 'active' | 'on_leave' | 'terminated';

export const EMPLOYEE_STATUSES: readonly EmployeeStatus[] = Object.freeze([
    'active',
    'on_leave',
    'terminated',
]);

/**
 * Compact Employee shape — used in list (index) responses. Drops
 * `email`/`created_at`/`updated_at` for payload efficiency. Renders in
 * the list page table.
 *
 * Extends `Record<string, unknown>` so the shared DataTable component's
 * generic constraint (`T extends Record<string, unknown>`) is satisfied
 * — same precedent as ComponentsPlaygroundPage's DemoEntry. The
 * intersection is structural only; consumers still get strict field
 * access on the named keys.
 */
export interface EmployeeBrief extends Record<string, unknown> {
    id: number;
    employee_code: string;
    full_name: string;
    /** Flat department name (not the full nested object) — list shape is
     *  compact. Null when the employee has no current department, OR when
     *  the assigned department was soft-deleted. */
    department_name: string | null;
    /** Flat position title — replaces the old free-text job_title field
     *  (dropped in the Positions slice cutover). Same soft-delete
     *  nullability discipline as department_name. */
    position_title: string | null;
    /** ISO 8601 date (YYYY-MM-DD). */
    hire_date: string;
    status: EmployeeStatus;
}

/**
 * Nested department snapshot embedded in the full Employee resource.
 * Three fields only — enough for the detail page to render a clickable
 * link, no department metadata (description, timestamps, status) bleeds
 * into every employee payload.
 */
export interface EmployeeDepartment {
    id: number;
    code: string;
    name: string;
}

/**
 * Nested position snapshot — same projection pattern as
 * EmployeeDepartment. Replaces the old free-text job_title field
 * (dropped in the Positions slice cutover).
 */
export interface EmployeePosition {
    id: number;
    code: string;
    title: string;
}

/**
 * Full Employee shape — returned by show / store / update endpoints.
 * Drives the detail page and the form's edit-mode initial values.
 */
export interface Employee {
    id: number;
    employee_code: string;
    full_name: string;
    email: string | null;
    /** Nested department snapshot, or null when unassigned / soft-deleted.
     *  See EmployeeDepartment for the shape. */
    department: EmployeeDepartment | null;
    /** Nested position snapshot, or null when unassigned / soft-deleted.
     *  Replaces the old free-text job_title field. See EmployeePosition
     *  for the shape. */
    position: EmployeePosition | null;
    /** ISO 8601 date (YYYY-MM-DD). */
    hire_date: string;
    status: EmployeeStatus;
    /** ISO 8601 timestamp. */
    created_at: string;
    /** ISO 8601 timestamp. */
    updated_at: string;
}

/**
 * Query parameters accepted by GET /api/v1/hrm/employees. All optional.
 * Empty / undefined values are omitted from the request — the API client
 * builds the URL accordingly.
 */
export interface EmployeeListParams {
    search?: string;
    status?: EmployeeStatus;
    /** Filter to a specific department. Cross-tenant or cross-company ids
     *  silently return empty results — no 422, no leak. Used by the
     *  Department detail page's "View employees" link. */
    department_id?: number;
    /** Filter to employees holding a specific position. Same silent-empty
     *  semantics as department_id. Used by the Position detail page's
     *  "View employees" link (lands in Session 3). */
    position_id?: number;
    /** 1–100, default 25 on the backend. */
    per_page?: number;
    /** 1-indexed, default 1. Standard Laravel pagination. */
    page?: number;
}

/** Laravel paginator meta — same shape across every paginated endpoint. */
export interface PaginationMeta {
    current_page: number;
    from: number | null;
    to: number | null;
    per_page: number;
    total: number;
    last_page: number;
}

export interface PaginationLinks {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
}

export interface EmployeeListResponse {
    data: EmployeeBrief[];
    meta: PaginationMeta;
    links: PaginationLinks;
}

export interface EmployeeShowResponse {
    data: Employee;
}

/**
 * Request body for POST /api/v1/hrm/employees. `tenant_id` and
 * `company_id` are deliberately absent — the backend derives them from
 * the request context and ignores any client-supplied values.
 */
export interface CreateEmployeeRequest {
    employee_code: string;
    full_name: string;
    email?: string | null;
    /** FK → departments.id, or null for "no department". MUST be a
     *  department in the same (tenant, company) — the backend enforces
     *  this via scoped Rule::exists; a foreign-context id returns 422
     *  with `errors.department_id`. The form's setErrors path maps it
     *  to the picker inline. */
    department_id?: number | null;
    /** FK → positions.id, or null for "no current position". Same
     *  load-bearing scoped-exists guarantee as department_id — a
     *  foreign-context id returns 422 with `errors.position_id`.
     *  Replaces the old free-text job_title field. */
    position_id?: number | null;
    /** ISO 8601 date (YYYY-MM-DD). */
    hire_date: string;
    status: EmployeeStatus;
}

/**
 * Request body for PATCH /api/v1/hrm/employees/{id}. All fields optional
 * — `sometimes` rules on the backend. Send only what changed.
 */
export type UpdateEmployeeRequest = Partial<CreateEmployeeRequest>;
