import type { LeaveRequestListParams } from '@/modules/hrm/types/leaveRequest';

// ─────────────────────────────────────────────────────────────────────────────
// Leave Request query-key factory.
//
// Same TanStack Query convention as employeeQueryKeys / departmentQueryKeys:
//   ['leaveRequests']                         → all leave-request queries (broad invalidate)
//   ['leaveRequests', 'list', { ...params }]  → a specific paginated list
//   ['leaveRequests', 'detail', id]           → a specific record's detail
//
// Mutations (create / update / delete / approve / reject) invalidate by
// .all, which refreshes both open lists AND any open detail pane. This
// is critical for the workflow UX: after a manager clicks Approve, the
// detail page must re-render in "decided" mode, AND any open list tab
// must update the row's status badge. .all invalidation does both in one
// shot.
// ─────────────────────────────────────────────────────────────────────────────

export const leaveRequestQueryKeys = {
    all: ['leaveRequests'] as const,

    list: (params: LeaveRequestListParams = {}) =>
        [...leaveRequestQueryKeys.all, 'list', params] as const,

    detail: (id: number) => [...leaveRequestQueryKeys.all, 'detail', id] as const,
} as const;
