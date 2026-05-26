import type { BranchListParams } from '@/modules/hrm/types/branch';

// ─────────────────────────────────────────────────────────────────────────────
// Branch query-key factory. Standard TanStack 3-key shape — mirror of
// positionQueryKeys. Mutations invalidate by .all so any open list AND
// any open detail pane refresh in one shot.
// ─────────────────────────────────────────────────────────────────────────────

export const branchQueryKeys = {
    all: ['branches'] as const,

    list: (params: BranchListParams = {}) =>
        [...branchQueryKeys.all, 'list', params] as const,

    detail: (id: number) => [...branchQueryKeys.all, 'detail', id] as const,
} as const;
