// ─────────────────────────────────────────────────────────────────────────────
// Attendance types — mirror backend/docs/api/v1/hrm.md exactly.
//
// Source of truth is the backend contract. Any drift here is a bug.
//
// Soft-delete nullability discipline (from the PHPStan Employee|null
// lesson): employee_name / employee_code on the brief shape and the
// nested employee object on the full shape are ALL `| null`. The
// backend's belongsTo respects SoftDeletes on Employee, so a record
// whose parent employee was archived returns null for those fields.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attendance status — admin-recorded label. Mirrors backend
 * AttendanceStatus enum.
 *
 *   present  — employee was present for their normal hours
 *   absent   — no clock times typical
 *   late     — present but clocked in after expected start
 *   on_leave — MANUAL LABEL (not derived from Leave Requests this slice).
 *              See hrm.md "Relationship to Leave Requests" — the coupling
 *              is deferred to the Leave Balances slice.
 *   half_day — partial day (one of the clock times may be null)
 */
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'on_leave' | 'half_day';

export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = Object.freeze([
    'present',
    'absent',
    'late',
    'on_leave',
    'half_day',
]);

/**
 * Nested employee snapshot on the full resource. Three fields only —
 * enough for the detail page to render identification + a link, no
 * employee metadata bleeds in. Null when the parent employee row was
 * soft-deleted (same pattern as LeaveRequest.employee).
 */
export interface AttendanceRecordEmployee {
    id: number;
    employee_code: string;
    full_name: string;
}

/**
 * Compact AttendanceRecord shape — used in list (index) responses.
 *
 * employee_name / employee_code are null for soft-deleted parent rows;
 * the list page renders a "(deleted employee)" placeholder for those
 * rows so the attendance history stays scannable.
 *
 * Extends Record<string, unknown> so the shared DataTable's generic
 * constraint is satisfied — same precedent as EmployeeBrief and
 * LeaveRequestBrief.
 */
export interface AttendanceRecordBrief extends Record<string, unknown> {
    id: number;
    employee_id: number;
    employee_name: string | null;
    employee_code: string | null;
    /** ISO 8601 date (YYYY-MM-DD). */
    date: string;
    /** "HH:MM:SS" or null (absent / on_leave). */
    clock_in: string | null;
    clock_out: string | null;
    status: AttendanceStatus;
}

/**
 * Full AttendanceRecord shape — returned by show / store / update.
 * Drives the detail page and the form's edit-mode initial values.
 */
export interface AttendanceRecord {
    id: number;
    /** Null when the parent employee row was soft-deleted. */
    employee: AttendanceRecordEmployee | null;
    date: string;
    clock_in: string | null;
    clock_out: string | null;
    status: AttendanceStatus;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Query parameters for GET /api/v1/hrm/attendance. All optional.
 * Empty / undefined values are stripped at the API client layer.
 */
export interface AttendanceListParams {
    employee_id?: number;
    status?: AttendanceStatus;
    /** ISO 8601 date. Records with date >= from. */
    from?: string;
    /** ISO 8601 date. Records with date <= to. */
    to?: string;
    per_page?: number;
    page?: number;
}

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

export interface AttendanceListResponse {
    data: AttendanceRecordBrief[];
    meta: PaginationMeta;
    links: PaginationLinks;
}

export interface AttendanceShowResponse {
    data: AttendanceRecord;
}

/**
 * Request body for POST /api/v1/hrm/attendance.
 *
 * clock_in / clock_out are HH:MM:SS strings matching the format
 * timeConversion.ts emits AND the backend's Postgres TIME column
 * accepts. Nullable for absent / on_leave records.
 */
export interface CreateAttendanceRequest {
    employee_id: number;
    date: string;
    clock_in?: string | null;
    clock_out?: string | null;
    status: AttendanceStatus;
    notes?: string | null;
}

/**
 * Request body for PATCH /api/v1/hrm/attendance/{id}. All optional —
 * backend uses `sometimes` rules. Send only what changed.
 *
 * The backend's after() closure re-checks the (employee_id, date)
 * uniqueness with ignore-self when either field is in the payload,
 * AND re-checks clock_out >= clock_in with effective values via
 * input-fallback. A PATCH that changes only employee_id can still
 * 422 with errors.date if the new combination collides.
 */
export type UpdateAttendanceRequest = Partial<CreateAttendanceRequest>;
