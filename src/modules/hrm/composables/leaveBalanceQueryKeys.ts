import type { LeaveBalanceListParams } from '@/modules/hrm/types/leaveBalance';

// ─────────────────────────────────────────────────────────────────────────────
// Leave Balance query-key factory. Standard TanStack 3-key shape —
// mirror of branchQueryKeys. Mutations invalidate by .all so any open
// list AND any open detail pane refresh in one shot.
//
// Critical: invalidation cascades to the EmployeeLeaveBalancesCard
// (Session 3) too, because that card uses the same `.list` keys with
// a different param set (employee_id + period_year filter).
// ─────────────────────────────────────────────────────────────────────────────

export const leaveBalanceQueryKeys = {
    all: ['leave-balances'] as const,

    list: (params: LeaveBalanceListParams = {}) =>
        [...leaveBalanceQueryKeys.all, 'list', params] as const,

    detail: (id: number) => [...leaveBalanceQueryKeys.all, 'detail', id] as const,

    // Distinct subtree for the EmployeeDetailPage "Leave Balances" card.
    // Sits under .all so create/update/delete mutations invalidate it
    // along with the list and detail keys (single .all invalidation
    // refreshes every surface). Distinct from .list so the card +
    // list-page-filtered-to-the-same-employee don't share cache —
    // different contexts, different staleTime tunings.
    byEmployee: (employeeId: number, periodYear: number) =>
        [...leaveBalanceQueryKeys.all, 'by-employee', employeeId, periodYear] as const,
} as const;
