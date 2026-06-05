import type { AdminUsersListParams } from '@/modules/admin/types/user';

// ─────────────────────────────────────────────────────────────────────────────
// TanStack Query key tuples for the admin users domain. Single source of
// truth — useUsersQuery / useUserQuery / mutations all reference these.
//
// Mirrors the tenantQueryKeys / employeeQueryKeys shape: a tagged root
// for invalidation, a list key reactive to params, a detail key reactive
// to id.
// ─────────────────────────────────────────────────────────────────────────────

export const adminUserQueryKeys = {
    all: ['admin', 'users'] as const,
    list: (params: AdminUsersListParams) =>
        ['admin', 'users', 'list', params] as const,
    detail: (id: number) => ['admin', 'users', 'detail', id] as const,
};
