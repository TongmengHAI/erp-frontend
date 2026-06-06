import type { AdminRolesListParams } from '@/modules/admin/types/role';

// ─────────────────────────────────────────────────────────────────────────────
// TanStack Query key tuples for the admin roles domain. Single source of
// truth — useAdminRolesQuery / useAdminRoleQuery / mutations all reference
// these.
//
// Mirrors the adminUserQueryKeys shape: a tagged root for invalidation, a
// list key reactive to params, a detail key reactive to id.
// ─────────────────────────────────────────────────────────────────────────────

export const adminRoleQueryKeys = {
    all: ['admin', 'roles'] as const,
    list: (params: AdminRolesListParams) =>
        ['admin', 'roles', 'list', params] as const,
    detail: (id: number) => ['admin', 'roles', 'detail', id] as const,
    impact: (id: number, removed: string[]) =>
        ['admin', 'roles', 'impact', id, removed] as const,
};

/**
 * Permission descriptions cache key. Single tuple (the catalog is
 * locale-scoped, not per-tenant or per-user).
 */
export const permissionDescriptionsQueryKey = [
    'admin',
    'permissions',
    'descriptions',
] as const;
