// ─────────────────────────────────────────────────────────────────────────────
// LeaveRequest types — mirror backend/docs/api/v1/hrm.md exactly.
//
// Source of truth is the backend contract. Any drift here is a bug. If a
// field shape changes upstream, update both this file and the consuming
// callsites in a single slice.
//
// State-machine fields (status + the approval block) drive the detail
// page's branching via useLeaveRequestDetailMode. Keep the literal-union
// types narrow so TS exhaustiveness checks the consumer's switch.
//
// Soft-delete nullability discipline (load-bearing): any backend
// belongsTo can return null when the parent row is soft-deleted. That
// means `employee` on the full resource and `employee_name`/`employee_code`
// on the list shape are ALL `| null`-typed even though most rows have a
// non-null value. PHPStan caught this pattern on the backend annotation
// (LeaveRequest.$employee was typed Employee, should be Employee|null —
// the brief resource was using nullsafe access correctly). Mirroring the
// nullability here keeps the TS types honest for both first-page lists
// and edge-case "the employee was deleted while their request is still
// historical" reads.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Workflow state. Mirrors backend LeaveRequestStatus enum string values.
 *
 *   pending   — submitted, awaiting decision (the only mutable state)
 *   approved  — terminal, decided by an .approve user
 *   rejected  — terminal, decided by an .approve user
 */
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';

export const LEAVE_REQUEST_STATUSES: readonly LeaveRequestStatus[] = Object.freeze([
    'pending',
    'approved',
    'rejected',
]);

/**
 * Leave type taxonomy. Mirrors backend LeaveType enum.
 *
 *   annual / sick / unpaid / other — open to extension (other is the
 *   safety valve). Adding a fifth value requires a coordinated change:
 *   backend enum + DB CHECK + this union + i18n keys for the new label.
 */
export type LeaveType = 'annual' | 'sick' | 'unpaid' | 'other';

export const LEAVE_TYPES: readonly LeaveType[] = Object.freeze([
    'annual',
    'sick',
    'unpaid',
    'other',
]);

/**
 * Day-part granularity. Mirrors backend DayPart enum.
 *
 *   full_day  — request spans entire workdays (can be a single date OR
 *               a multi-date range)
 *   morning   — half-day, morning only. By construction start == end
 *   afternoon — half-day, afternoon only. Same constraint
 *
 * The single-date invariant for morning/afternoon is enforced at three
 * layers (Zod refinement here + FormRequest closure + DB composite
 * CHECK). See backend/docs/api/v1/hrm.md "Day-part granularity".
 *
 * Hourly granularity is NOT modeled — separate future module.
 */
export type DayPart = 'full_day' | 'morning' | 'afternoon';

export const DAY_PARTS: readonly DayPart[] = Object.freeze([
    'full_day',
    'morning',
    'afternoon',
]);

/**
 * Nested employee snapshot embedded in the full LeaveRequest resource.
 * Three fields only — enough for the detail page to render employee
 * identification + a link, no employee metadata bleeds in.
 *
 * Backend may return null for the whole object when the related employee
 * was soft-deleted. See the file-level soft-delete-nullability note.
 */
export interface LeaveRequestEmployee {
    id: number;
    employee_code: string;
    full_name: string;
}

/**
 * Approver snapshot in the approval block. Null when the approver user
 * was hard-deleted (FK ON DELETE SET NULL — the decision survives, the
 * actor name is lost; the audit log retains the full actor history).
 */
export interface LeaveRequestApprover {
    id: number;
    name: string;
}

/**
 * Approval metadata block — present only on decided rows. The backend's
 * composite DB CHECK guarantees: status<>'pending' ⇒ approved_at AND
 * (approved_by, which becomes `approver` here once resolved) are NOT
 * NULL on the row. But `approver` (the resolved User) can still be null
 * if the user was deleted.
 */
export interface LeaveRequestApproval {
    /** ISO 8601 instant of the decision. */
    approved_at: string;
    /** May be null when the approver user was hard-deleted. */
    approver: LeaveRequestApprover | null;
    /** Optional decision note. Null when the manager didn't add one. */
    note: string | null;
}

/**
 * Compact LeaveRequest shape — used in list (index) responses. Drops the
 * full approval block; flattens approver name + approved_at into top-
 * level fields so DataTable columns can render a "Decided by" string.
 *
 * Extends `Record<string, unknown>` for the shared DataTable component's
 * generic constraint — same precedent as EmployeeBrief.
 */
export interface LeaveRequestBrief extends Record<string, unknown> {
    id: number;
    /** FK column — the row always has an integer (NOT NULL). */
    employee_id: number;
    /** Resolved name; null when the related Employee row was soft-deleted. */
    employee_name: string | null;
    /** Same as above. */
    employee_code: string | null;
    leave_type: LeaveType;
    /** ISO 8601 date (YYYY-MM-DD). */
    start_date: string;
    /** ISO 8601 date (YYYY-MM-DD). For half-day requests (day_part
     *  morning/afternoon), the backend guarantees end_date == start_date. */
    end_date: string;
    /** Day-part granularity. Drives the Dates column's display variant —
     *  "Fri, May 22 (Morning)" for half-day, "Fri, May 22 → Fri, May 26"
     *  for full-day ranges, "Fri, May 22" for full-day single dates. */
    day_part: DayPart;
    /** Calendar-day count, derived server-side from start_date, end_date,
     *  and day_part by LeaveDaysCalculator. Always > 0; half-day requests
     *  carry 0.5. The Leave Balances slice aggregates this via SUM. */
    days_count: number;
    status: LeaveRequestStatus;
    /** Null on pending rows. */
    approved_at: string | null;
    /** Null on pending rows; also null if the approver user was deleted. */
    approver_name: string | null;
}

/**
 * Full LeaveRequest shape — returned by show / store / update /
 * approve / reject. Drives the detail page and the form's edit-mode
 * initial values.
 */
export interface LeaveRequest {
    id: number;
    /** Nested snapshot, or null when the related Employee was soft-deleted. */
    employee: LeaveRequestEmployee | null;
    leave_type: LeaveType;
    /** ISO 8601 date (YYYY-MM-DD). */
    start_date: string;
    /** ISO 8601 date (YYYY-MM-DD). For half-day requests (day_part
     *  morning/afternoon), the backend guarantees end_date == start_date. */
    end_date: string;
    /** Day-part granularity. See LeaveRequestBrief.day_part docblock. */
    day_part: DayPart;
    /** Calendar-day count — same field as LeaveRequestBrief.days_count.
     *  Surfaced on the detail page next to the dates, and aggregated by
     *  the Leave Balances slice. */
    days_count: number;
    reason: string | null;
    status: LeaveRequestStatus;
    /** Present only on decided rows; null while pending. */
    approval: LeaveRequestApproval | null;
    /** ISO 8601 timestamp. */
    created_at: string;
    /** ISO 8601 timestamp. */
    updated_at: string;
}

/**
 * Query parameters for GET /api/v1/hrm/leave-requests. All optional.
 * Empty / undefined values are stripped at the API client layer before
 * the request fires (see cleanParams in api/leaveRequests.ts).
 */
export interface LeaveRequestListParams {
    employee_id?: number;
    status?: LeaveRequestStatus;
    leave_type?: LeaveType;
    /** ISO 8601 date. Filters to requests with end_date >= from. */
    from?: string;
    /** ISO 8601 date. Filters to requests with start_date <= to. */
    to?: string;
    /** 1–100, default 25 on the backend. */
    per_page?: number;
    /** 1-indexed, default 1. */
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

export interface LeaveRequestListResponse {
    data: LeaveRequestBrief[];
    meta: PaginationMeta;
    links: PaginationLinks;
}

export interface LeaveRequestShowResponse {
    data: LeaveRequest;
}

/**
 * Request body for POST /api/v1/hrm/leave-requests. status and approval
 * fields are deliberately ABSENT — the backend forces status=pending and
 * the FormRequest doesn't validate them. Sending them is a no-op (silently
 * dropped) but we don't model them here so a frontend typo can't shape an
 * expectation that doesn't match reality.
 */
export interface CreateLeaveRequestRequest {
    employee_id: number;
    leave_type: LeaveType;
    /** ISO 8601 date (YYYY-MM-DD). */
    start_date: string;
    /** ISO 8601 date (YYYY-MM-DD). MUST be >= start_date (422 otherwise).
     *  For day_part morning/afternoon, MUST equal start_date (422 otherwise
     *  via the FormRequest closure). */
    end_date: string;
    /** Day-part granularity. Optional — backend defaults to full_day on
     *  omission, matching the most common case. */
    day_part?: DayPart;
    reason?: string | null;
}

/**
 * Request body for PATCH /api/v1/hrm/leave-requests/{id}. All fields
 * optional — backend uses `sometimes` rules. Send only what changed.
 *
 * The PATCH endpoint additionally enforces a state-machine guard: it
 * returns 422 with error_code='invalid_transition' if the row isn't
 * pending. The detail page hides the Edit button on decided rows; the
 * form page guards against direct-URL access to /edit on decided rows
 * (see EditPage's loaded-state branching).
 */
export type UpdateLeaveRequestRequest = Partial<CreateLeaveRequestRequest>;

/**
 * Body for POST /{id}/approve and POST /{id}/reject. One optional field:
 * the manager's decision note. The decision shape is identical for both
 * verbs — the URL distinguishes intent.
 */
export interface DecideLeaveRequestRequest {
    note?: string | null;
}

/**
 * Backend transition-error response shape. Returned with HTTP 422 by:
 *   - PATCH /{id} on a non-pending row
 *   - POST /{id}/approve on a non-pending row
 *   - POST /{id}/reject on a non-pending row
 *
 * Distinguished from generic 422 (errors.field[]) by the `error_code`
 * field. The detail page surfaces it as a toast with a refetch — the row
 * has changed under the user (race condition: someone else decided it
 * between page-load and the user's click).
 */
export interface InvalidTransitionErrorBody {
    message: string;
    error_code: 'invalid_transition';
    from: LeaveRequestStatus;
    to: LeaveRequestStatus;
}
