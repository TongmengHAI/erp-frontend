import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';

import * as employeesApi from '@/modules/hrm/api/employees';
import { employeeQueryKeys } from '@/modules/hrm/composables/employeeQueryKeys';
import type {
    CreateEmployeeRequest,
    EmployeeListParams,
    UpdateEmployeeRequest,
} from '@/modules/hrm/types/employee';

// ─────────────────────────────────────────────────────────────────────────────
// Employee composables — TanStack Query wrappers.
//
// All four mutations invalidate `employeeQueryKeys.all` on success, which
// refreshes any open list AND any open detail pane in one shot. Granular
// invalidation isn't needed at this scale and would risk stale list rows
// after edits.
//
// Mutations DO NOT swallow errors — 401 / 403 / 404 / 422 propagate to the
// page layer where the form/page maps them to UI (422 → field errors,
// others → banner / toast / route redirect). See LoginPage.vue for the
// canonical 422 → setErrors pattern that EmployeeFormPage will reuse.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paginated employee list. Pass params reactively (ref / computed / getter)
 * so the query refetches automatically as filters change. Internally the
 * query key includes the reactive params, so changing search/status/page
 * spawns the new request without manual `refetch()` calls.
 */
export function useEmployeesQuery(
    params: MaybeRefOrGetter<EmployeeListParams> = () => ({}),
) {
    return useQuery({
        // Computed key — reacts to the params source. TanStack will refetch
        // automatically when the key changes.
        queryKey: computed(() => employeeQueryKeys.list(toValue(params))),
        queryFn: () => employeesApi.listEmployees(toValue(params)),
        // List requests are cheap on the backend (single indexed paginate)
        // — short stale time keeps the UI lively without thrashing.
        staleTime: 30_000,
    });
}

/**
 * Single employee detail. `id` is reactive so a router param change
 * (`/hrm/employees/1` → `/hrm/employees/2`) refetches without a remount.
 */
export function useEmployeeQuery(id: MaybeRefOrGetter<number>) {
    return useQuery({
        queryKey: computed(() => employeeQueryKeys.detail(toValue(id))),
        queryFn: () => employeesApi.getEmployee(toValue(id)),
        staleTime: 30_000,
        // Don't fire if id is somehow falsy (e.g. router param hasn't
        // resolved yet on a deep link). The guard avoids a spurious 404.
        enabled: computed(() => Number.isFinite(toValue(id)) && toValue(id) > 0),
    });
}

/**
 * Create. Caller invokes `mutate(payload)` from the form's submit handler.
 * The `onSuccess` here refreshes the list cache; the form is responsible
 * for navigation (success → push to detail page).
 */
export function useCreateEmployee() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateEmployeeRequest) =>
            employeesApi.createEmployee(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: employeeQueryKeys.all });
        },
    });
}

/**
 * Update. Caller invokes `mutate({ id, payload })`. Pattern: object arg
 * because TanStack mutations take a single value; the form passes both
 * the row id and the dirty-only payload.
 */
export function useUpdateEmployee() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateEmployeeRequest }) =>
            employeesApi.updateEmployee(id, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: employeeQueryKeys.all });
        },
    });
}

/**
 * Soft-delete. The 204 response carries no body — the mutation resolves
 * void. Caller is responsible for the confirm-dialog flow and the
 * post-success route push.
 */
export function useDeleteEmployee() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => employeesApi.deleteEmployee(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: employeeQueryKeys.all });
        },
    });
}
