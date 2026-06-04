import type { TenantListParams } from '@/modules/super-admin/types/tenant';

// ─────────────────────────────────────────────────────────────────────────────
// Tenant query-key factory. Standard TanStack 3-key shape. Mutations
// invalidate by .all so any open list AND any open detail pane refresh.
// ─────────────────────────────────────────────────────────────────────────────

export const tenantQueryKeys = {
    all: ['super-admin', 'tenants'] as const,

    list: (params: TenantListParams = {}) =>
        [...tenantQueryKeys.all, 'list', params] as const,

    detail: (id: number) => [...tenantQueryKeys.all, 'detail', id] as const,
} as const;
