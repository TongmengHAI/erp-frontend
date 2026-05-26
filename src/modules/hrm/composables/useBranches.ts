import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';

import * as branchesApi from '@/modules/hrm/api/branches';
import { branchQueryKeys } from '@/modules/hrm/composables/branchQueryKeys';
import type {
    BranchListParams,
    CreateBranchRequest,
    UpdateBranchRequest,
} from '@/modules/hrm/types/branch';

// ─────────────────────────────────────────────────────────────────────────────
// Branch composables — TanStack Query wrappers. Mirror of usePositions.
// All three mutations invalidate branchQueryKeys.all on success.
// ─────────────────────────────────────────────────────────────────────────────

export function useBranchesQuery(
    params: MaybeRefOrGetter<BranchListParams> = () => ({}),
) {
    return useQuery({
        queryKey: computed(() => branchQueryKeys.list(toValue(params))),
        queryFn: () => branchesApi.listBranches(toValue(params)),
        staleTime: 30_000,
    });
}

export function useBranchQuery(id: MaybeRefOrGetter<number>) {
    return useQuery({
        queryKey: computed(() => branchQueryKeys.detail(toValue(id))),
        queryFn: () => branchesApi.getBranch(toValue(id)),
        staleTime: 30_000,
        enabled: computed(() => Number.isFinite(toValue(id)) && toValue(id) > 0),
    });
}

export function useCreateBranch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateBranchRequest) =>
            branchesApi.createBranch(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: branchQueryKeys.all });
        },
    });
}

export function useUpdateBranch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateBranchRequest }) =>
            branchesApi.updateBranch(id, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: branchQueryKeys.all });
        },
    });
}

export function useDeleteBranch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => branchesApi.deleteBranch(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: branchQueryKeys.all });
        },
    });
}
