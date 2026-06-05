import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery } from '@tanstack/vue-query';

import * as adminUsersApi from '@/modules/admin/api/users';
import { adminUserQueryKeys } from '@/modules/admin/composables/adminUserQueryKeys';
import type { AdminUsersListParams } from '@/modules/admin/types/user';

// ─────────────────────────────────────────────────────────────────────────────
// Admin user composables — TanStack Query wrappers.
//
// Mirrors the useEmployees shape:
//   • useAdminUsersQuery — paginated list, params reactive
//   • useAdminUserQuery  — single detail, id reactive
//
// Mutations land in Session 4 (PATCH update + 4 lifecycle transitions).
// ─────────────────────────────────────────────────────────────────────────────

export function useAdminUsersQuery(
    params: MaybeRefOrGetter<AdminUsersListParams> = () => ({}),
) {
    return useQuery({
        queryKey: computed(() => adminUserQueryKeys.list(toValue(params))),
        queryFn: () => adminUsersApi.listAdminUsers(toValue(params)),
        staleTime: 30_000,
    });
}

export function useAdminUserQuery(id: MaybeRefOrGetter<number>) {
    return useQuery({
        queryKey: computed(() => adminUserQueryKeys.detail(toValue(id))),
        queryFn: () => adminUsersApi.getAdminUser(toValue(id)),
        staleTime: 30_000,
        enabled: computed(() => Number.isFinite(toValue(id)) && toValue(id) > 0),
    });
}
