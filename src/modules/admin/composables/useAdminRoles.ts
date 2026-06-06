import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';

import * as adminRolesApi from '@/modules/admin/api/roles';
import {
    adminRoleQueryKeys,
    permissionDescriptionsQueryKey,
} from '@/modules/admin/composables/adminRoleQueryKeys';
import { getPermissionDescriptions } from '@/modules/admin/api/permissions';
import type {
    AdminRolesListParams,
    CreateRoleRequest,
    UpdateRoleRequest,
} from '@/modules/admin/types/role';

// ─────────────────────────────────────────────────────────────────────────────
// Admin role composables — TanStack Query wrappers.
//
// Mirrors useAdminUsers' shape:
//   • useAdminRolesQuery — paginated list, params reactive
//   • useAdminRoleQuery  — single detail, id reactive
//
// Session 3 covers list + detail + delete (so the detail page's
// destructive affordance works). Session 4 adds create/update/impact.
// ─────────────────────────────────────────────────────────────────────────────

export function useAdminRolesQuery(
    params: MaybeRefOrGetter<AdminRolesListParams> = () => ({}),
) {
    return useQuery({
        queryKey: computed(() => adminRoleQueryKeys.list(toValue(params))),
        queryFn: () => adminRolesApi.listAdminRoles(toValue(params)),
        staleTime: 30_000,
    });
}

export function useAdminRoleQuery(id: MaybeRefOrGetter<number>) {
    return useQuery({
        queryKey: computed(() => adminRoleQueryKeys.detail(toValue(id))),
        queryFn: () => adminRolesApi.getAdminRole(toValue(id)),
        staleTime: 30_000,
        enabled: computed(() => Number.isFinite(toValue(id)) && toValue(id) > 0),
    });
}

/**
 * Permission descriptions — static per deploy + locale. Cached with
 * staleTime: Infinity (the registry does not change between page
 * navigations within a session). The PermissionList component reads
 * this cache to render human-readable labels alongside the role's
 * permissions array.
 */
export function usePermissionDescriptionsQuery() {
    return useQuery({
        queryKey: permissionDescriptionsQueryKey,
        queryFn: () => getPermissionDescriptions(),
        staleTime: Infinity,
        gcTime: Infinity,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations — Session 3 ships delete only (the detail-page destructive
// affordance). Create + update land in Session 4 with the form pages.
// ─────────────────────────────────────────────────────────────────────────────

export function useDeleteRoleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => adminRolesApi.deleteAdminRole(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: adminRoleQueryKeys.all });
        },
    });
}

export function useCreateRoleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateRoleRequest) => adminRolesApi.createAdminRole(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: adminRoleQueryKeys.all });
        },
    });
}

export function useUpdateRoleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateRoleRequest }) =>
            adminRolesApi.updateAdminRole(id, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: adminRoleQueryKeys.all });
        },
    });
}
