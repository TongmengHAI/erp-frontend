import type { HrmSettingsShowParams } from '@/modules/admin/types/hrmSettings';

// ─────────────────────────────────────────────────────────────────────────────
// HRM Settings query-key factory. Standard TanStack 3-key shape.
//
// Detail keys are scoped by company_id so the company picker can flip
// the active query target without needing to invalidate. The update
// mutation invalidates by .all so any open detail pane refreshes.
// ─────────────────────────────────────────────────────────────────────────────

export const hrmSettingsQueryKeys = {
    all: ['admin', 'hrm-settings'] as const,

    detail: (params: HrmSettingsShowParams = {}) =>
        [...hrmSettingsQueryKeys.all, 'detail', params] as const,
} as const;
