import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';

import * as adminUsersApi from '@/modules/admin/api/users';
import { adminUserQueryKeys } from '@/modules/admin/composables/adminUserQueryKeys';
import type {
    AdminUsersListParams,
    InviteUserRequest,
    UpdateAdminUserRequest,
} from '@/modules/admin/types/user';

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

/**
 * Role options for the invite + edit Select. Cached aggressively
 * (15-min staleTime) — the role catalog only changes in a custom-
 * roles feature that doesn't ship until Phase 2B.
 */
export function useRoleOptionsQuery() {
    return useQuery({
        queryKey: ['admin', 'users', 'role-options'] as const,
        queryFn: () => adminUsersApi.listRoleOptions(),
        staleTime: 15 * 60_000,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations — all invalidate adminUserQueryKeys.all on success so the
// detail card + the list page refresh in one go. Granular invalidation
// isn't worth the complexity at Phase 2A scale (the lifecycle endpoints
// return the updated user payload; manual cache writes could refine
// this later if needed).
// ─────────────────────────────────────────────────────────────────────────────

export function useInviteUserMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: InviteUserRequest) => adminUsersApi.inviteUser(payload),
        onSuccess: () => {
            // Invitations live in their own query layer (Session 5 frontend
            // for the invitation list page); invalidate the admin-users
            // tree too since "users" admin sidebar may show invitation
            // counts in the future.
            void queryClient.invalidateQueries({ queryKey: adminUserQueryKeys.all });
        },
    });
}

export function useUpdateAdminUserMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateAdminUserRequest }) =>
            adminUsersApi.updateAdminUser(id, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: adminUserQueryKeys.all });
        },
    });
}

function lifecycleMutation(fn: (id: number) => Promise<unknown>) {
    return () => {
        const queryClient = useQueryClient();
        return useMutation({
            mutationFn: (id: number) => fn(id),
            onSuccess: () => {
                void queryClient.invalidateQueries({ queryKey: adminUserQueryKeys.all });
            },
        });
    };
}

export const useDisableUserMutation = lifecycleMutation(adminUsersApi.disableAdminUser);
export const useEnableUserMutation = lifecycleMutation(adminUsersApi.enableAdminUser);
export const useDeactivateUserMutation = lifecycleMutation(adminUsersApi.deactivateAdminUser);
export const useRestoreUserMutation = lifecycleMutation(adminUsersApi.restoreAdminUser);
