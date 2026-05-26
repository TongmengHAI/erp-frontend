import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';

import * as leaveBalancesApi from '@/modules/hrm/api/leaveBalances';
import { leaveBalanceQueryKeys } from '@/modules/hrm/composables/leaveBalanceQueryKeys';
import type {
    CreateLeaveBalanceRequest,
    LeaveBalanceListParams,
    UpdateLeaveBalanceRequest,
} from '@/modules/hrm/types/leaveBalance';

// ─────────────────────────────────────────────────────────────────────────────
// Leave Balance composables — TanStack Query wrappers. Mirror of
// useBranches. All three mutations invalidate leaveBalanceQueryKeys.all
// on success — refreshes the list page AND the Employee detail card
// (Session 3) in one shot.
// ─────────────────────────────────────────────────────────────────────────────

export function useLeaveBalancesQuery(
    params: MaybeRefOrGetter<LeaveBalanceListParams> = () => ({}),
) {
    return useQuery({
        queryKey: computed(() => leaveBalanceQueryKeys.list(toValue(params))),
        queryFn: () => leaveBalancesApi.listLeaveBalances(toValue(params)),
        staleTime: 30_000,
    });
}

export function useLeaveBalanceQuery(id: MaybeRefOrGetter<number>) {
    return useQuery({
        queryKey: computed(() => leaveBalanceQueryKeys.detail(toValue(id))),
        queryFn: () => leaveBalancesApi.getLeaveBalance(toValue(id)),
        staleTime: 30_000,
        enabled: computed(() => Number.isFinite(toValue(id)) && toValue(id) > 0),
    });
}

export function useCreateLeaveBalance() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateLeaveBalanceRequest) =>
            leaveBalancesApi.createLeaveBalance(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: leaveBalanceQueryKeys.all });
        },
    });
}

export function useUpdateLeaveBalance() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateLeaveBalanceRequest }) =>
            leaveBalancesApi.updateLeaveBalance(id, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: leaveBalanceQueryKeys.all });
        },
    });
}

export function useDeleteLeaveBalance() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => leaveBalancesApi.deleteLeaveBalance(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: leaveBalanceQueryKeys.all });
        },
    });
}
