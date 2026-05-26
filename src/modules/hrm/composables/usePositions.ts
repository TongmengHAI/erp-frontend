import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';

import * as positionsApi from '@/modules/hrm/api/positions';
import { positionQueryKeys } from '@/modules/hrm/composables/positionQueryKeys';
import type {
    CreatePositionRequest,
    PositionListParams,
    UpdatePositionRequest,
} from '@/modules/hrm/types/position';

// ─────────────────────────────────────────────────────────────────────────────
// Position composables — TanStack Query wrappers. Mirror of useDepartments.
// All three mutations invalidate positionQueryKeys.all on success.
// ─────────────────────────────────────────────────────────────────────────────

export function usePositionsQuery(
    params: MaybeRefOrGetter<PositionListParams> = () => ({}),
) {
    return useQuery({
        queryKey: computed(() => positionQueryKeys.list(toValue(params))),
        queryFn: () => positionsApi.listPositions(toValue(params)),
        staleTime: 30_000,
    });
}

export function usePositionQuery(id: MaybeRefOrGetter<number>) {
    return useQuery({
        queryKey: computed(() => positionQueryKeys.detail(toValue(id))),
        queryFn: () => positionsApi.getPosition(toValue(id)),
        staleTime: 30_000,
        enabled: computed(() => Number.isFinite(toValue(id)) && toValue(id) > 0),
    });
}

export function useCreatePosition() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreatePositionRequest) =>
            positionsApi.createPosition(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: positionQueryKeys.all });
        },
    });
}

export function useUpdatePosition() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdatePositionRequest }) =>
            positionsApi.updatePosition(id, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: positionQueryKeys.all });
        },
    });
}

export function useDeletePosition() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => positionsApi.deletePosition(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: positionQueryKeys.all });
        },
    });
}
