import type { PositionListParams } from '@/modules/hrm/types/position';

// ─────────────────────────────────────────────────────────────────────────────
// Position query-key factory. Standard TanStack 3-key shape — mirror of
// departmentQueryKeys. Mutations invalidate by .all so any open list AND
// any open detail pane refresh in one shot.
// ─────────────────────────────────────────────────────────────────────────────

export const positionQueryKeys = {
    all: ['positions'] as const,

    list: (params: PositionListParams = {}) =>
        [...positionQueryKeys.all, 'list', params] as const,

    detail: (id: number) => [...positionQueryKeys.all, 'detail', id] as const,
} as const;
