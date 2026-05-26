import type { AttendanceListParams } from '@/modules/hrm/types/attendance';

// ─────────────────────────────────────────────────────────────────────────────
// Attendance query-key factory.
//
// Same TanStack Query convention as the other HRM modules:
//   ['attendance']                         → all attendance queries
//   ['attendance', 'list', { ...params }]  → a specific paginated list
//   ['attendance', 'detail', id]           → a specific record's detail
//
// Mutations (create / update / delete) invalidate by .all so any open
// list AND any open detail pane refresh in one shot.
// ─────────────────────────────────────────────────────────────────────────────

export const attendanceQueryKeys = {
    all: ['attendance'] as const,

    list: (params: AttendanceListParams = {}) =>
        [...attendanceQueryKeys.all, 'list', params] as const,

    detail: (id: number) => [...attendanceQueryKeys.all, 'detail', id] as const,
} as const;
