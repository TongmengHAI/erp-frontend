import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';

import * as departmentsApi from '@/modules/hrm/api/departments';
import { departmentQueryKeys } from '@/modules/hrm/composables/departmentQueryKeys';
import type {
    CreateDepartmentRequest,
    DepartmentListParams,
    UpdateDepartmentRequest,
} from '@/modules/hrm/types/department';

// ─────────────────────────────────────────────────────────────────────────────
// Department composables — mirror of useEmployees, swap-for-swap.
//
// Same conventions:
//   - List queries take reactive params; key changes drive refetch.
//   - Detail queries gate via `enabled` so route params that haven't
//     resolved don't trigger a 404 fetch.
//   - Mutations invalidate departmentQueryKeys.all on success.
//   - Errors propagate — page layer maps 422 to setErrors via the
//     LoginPage pattern.
// ─────────────────────────────────────────────────────────────────────────────

export function useDepartmentsQuery(
    params: MaybeRefOrGetter<DepartmentListParams> = () => ({}),
) {
    return useQuery({
        queryKey: computed(() => departmentQueryKeys.list(toValue(params))),
        queryFn: () => departmentsApi.listDepartments(toValue(params)),
        staleTime: 30_000,
    });
}

export function useDepartmentQuery(id: MaybeRefOrGetter<number>) {
    return useQuery({
        queryKey: computed(() => departmentQueryKeys.detail(toValue(id))),
        queryFn: () => departmentsApi.getDepartment(toValue(id)),
        staleTime: 30_000,
        enabled: computed(() => Number.isFinite(toValue(id)) && toValue(id) > 0),
    });
}

export function useCreateDepartment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateDepartmentRequest) =>
            departmentsApi.createDepartment(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: departmentQueryKeys.all });
        },
    });
}

export function useUpdateDepartment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateDepartmentRequest }) =>
            departmentsApi.updateDepartment(id, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: departmentQueryKeys.all });
        },
    });
}

export function useDeleteDepartment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => departmentsApi.deleteDepartment(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: departmentQueryKeys.all });
        },
    });
}
