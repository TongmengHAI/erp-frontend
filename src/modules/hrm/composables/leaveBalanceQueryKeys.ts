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
} as const;
