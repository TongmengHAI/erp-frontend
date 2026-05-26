// ─────────────────────────────────────────────────────────────────────────────
// LeaveBalance types — mirror backend/docs/api/v1/hrm.md exactly.
//
// First HRM resource with computed/derived state. The wire shape carries
// three numeric fields that look symmetric but have very different
// natures:
//
//   • allocated_days   — STORED. What the company granted; editable.
//   • consumed_days    — COMPUTED. SUM of approved leave_requests for
//                        the same (employee, leave_type, period_year).
//                        Read-only on the wire.
//   • remaining_days   — COMPUTED. allocated_days - consumed_days. CAN
//                        BE NEGATIVE (over-consumption is intentional —
//                        the UI labels it explicitly as "Over-consumed
//                        by N days").
//
// Over-consumed labeling discipline (locked Session 2 design): negative
// remaining_days renders with explicit copy, never as a bare "-2". See
// hrm.leaveBalance.detail.overConsumedLabel in en.json + the cell
// helpers in LeaveBalanceListPage / LeaveBalanceDetailPage / the
// EmployeeLeaveBalancesCard (Session 3).
// ─────────────────────────────────────────────────────────────────────────────

import type { DayPart } from '@/modules/hrm/types/leaveRequest';
import type { PaginationLinks, PaginationMeta } from '@/modules/hrm/types/employee';

/**
 * Allocated leave types. Subset of LeaveType — `unpaid` and `other` are
 * unbounded by design and have NO balance row. The DB CHECK constraint
 * `leave_balances_leave_type_check` enforces this at the storage layer;
 * the FormRequest's `Rule::in()` enforces it at the HTTP layer; this
 * narrowed type enforces it at the TypeScript layer. All three drift
 * together or not at all.
 */
export type BalanceLeaveType = 'annual' | 'sick';

export const BALANCE_LEAVE_TYPES: readonly BalanceLeaveType[] = Object.freeze([
    'annual',
    'sick',
]);

/**
 * Nested employee snapshot — three fields only, same projection as
 * EmployeeDepartment / EmployeePosition. Null when the backend
 * relation is soft-deleted (FK preserved but the row hidden).
 */
export interface LeaveBalanceEmployee {
    id: number;
    employee_code: string;
    full_name: string;
}

/**
 * Brief shape of one consuming leave_request — surfaces on the
 * detail page's "Consuming Leave Requests" cross-module section.
 * The full LR resource is at /hrm/leave-requests/{id}; this brief
 * is enough to render the row + the link.
 */
export interface ConsumingLeaveRequest {
    id: number;
    start_date: string;
    end_date: string;
    day_part: DayPart;
    days_count: number;
    /** ISO 8601 timestamp; the approval is what makes the row consume. */
    approved_at: string | null;
}

/**
 * Compact LeaveBalance shape — used in list (index) responses.
 *
 * employee_id is the structured FK; employee_name + employee_code are
 * the flat denormalised display fields (eager-loaded server-side, no
 * N+1). Both name/code are typed nullable to honor the soft-delete
 * nullability discipline used across the HRM brief shapes.
 *
 * Extends `Record<string, unknown>` to satisfy the shared DataTable's
 * generic constraint — same precedent as LeaveRequestBrief.
 */
export interface LeaveBalanceBrief extends Record<string, unknown> {
    id: number;
    employee_id: number;
    employee_name: string | null;
    employee_code: string | null;
    leave_type: BalanceLeaveType;
    period_year: number;
    allocated_days: number;
    consumed_days: number;
    /** Negative when over-consumed — see file-level docblock. */
    remaining_days: number;
}

/**
 * Full LeaveBalance shape — returned by show / store / update.
 *
 * `consuming_leave_requests` is populated ONLY by the show endpoint
 * (store/update return an empty array — saves a subquery on flows
 * where the cross-module section isn't rendered). The list is sorted
 * DESC by start_date and contains the approved LRs that contributed
 * to consumed_days. Filters mirror the SUM in LeaveBalanceQueryService
 * exactly (pending/rejected, sick-when-balance-is-annual, prior-year,
 * soft-deleted rows are all excluded).
 */
export interface LeaveBalance {
    id: number;
    employee: LeaveBalanceEmployee | null;
    leave_type: BalanceLeaveType;
    period_year: number;
    allocated_days: number;
    consumed_days: number;
    remaining_days: number;
    notes: string | null;
    consuming_leave_requests: ConsumingLeaveRequest[];
    /** ISO 8601 timestamp. */
    created_at: string;
    /** ISO 8601 timestamp. */
    updated_at: string;
}

/**
 * Query parameters for GET /api/v1/hrm/leave-balances. All optional.
 * Empty / undefined values stripped at the API client layer.
 */
export interface LeaveBalanceListParams {
    employee_id?: number;
    leave_type?: BalanceLeaveType;
    period_year?: number;
    per_page?: number;
    page?: number;
}

export interface LeaveBalanceListResponse {
    data: LeaveBalanceBrief[];
    meta: PaginationMeta;
    links: PaginationLinks;
}

export interface LeaveBalanceShowResponse {
    data: LeaveBalance;
}

/**
 * Request body for POST /api/v1/hrm/leave-balances.
 *
 * leave_type is narrowed to BalanceLeaveType — the backend's
 * FormRequest enforces the same subset via Rule::in() and the DB CHECK
 * is the final guard. Three-layer discipline (TS / FormRequest / DB)
 * matching the existing leave_type pattern.
 */
export interface CreateLeaveBalanceRequest {
    employee_id: number;
    leave_type: BalanceLeaveType;
    period_year: number;
    /** Half-day granularity supported; backend validates multiple_of:0.5. */
    allocated_days: number;
    notes?: string | null;
}

/**
 * Request body for PATCH /api/v1/hrm/leave-balances/{id}.
 *
 * Only allocated_days + notes are editable. The identity tuple
 * (employee_id + leave_type + period_year) is NOT in this shape —
 * changing it would conceptually create a different balance row.
 * A user wanting to move a balance creates a new row + deletes the old.
 */
export interface UpdateLeaveBalanceRequest {
    allocated_days?: number;
    notes?: string | null;
}
