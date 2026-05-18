import type { DepartmentListParams } from '@/modules/hrm/types/department';

// ─────────────────────────────────────────────────────────────────────────────
// Department query-key factory — mirrors employeeQueryKeys.
//
// Pattern (TanStack convention):
//   ['departments']                         → all department queries
//   ['departments', 'list', { ...params }]  → a specific paginated list
//   ['departments', 'detail', id]           → a specific record's detail
//
// Mutations invalidate by .all so both lists and any open detail pane
// refresh after writes.
// ─────────────────────────────────────────────────────────────────────────────

export const departmentQueryKeys = {
    all: ['departments'] as const,

    list: (params: DepartmentListParams = {}) =>
        [...departmentQueryKeys.all, 'list', params] as const,

    detail: (id: number) => [...departmentQueryKeys.all, 'detail', id] as const,
} as const;
