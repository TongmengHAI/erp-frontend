import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';

import * as leaveRequestsApi from '@/modules/hrm/api/leaveRequests';
import { leaveRequestQueryKeys } from '@/modules/hrm/composables/leaveRequestQueryKeys';
import type {
    CreateLeaveRequestRequest,
    DecideLeaveRequestRequest,
    LeaveRequestListParams,
    UpdateLeaveRequestRequest,
} from '@/modules/hrm/types/leaveRequest';

interface UseLeaveRequestsQueryOptions {
    /**
     * Conditionally fire the query. False → no fetch, no cache write,
     * `isLoading=false` and `data=undefined` from the start. Used by
     * the HRM dashboard's approver-queue section, which should not
     * request rows for users lacking hrm.leave_request.approve.
     */
    enabled?: ComputedRef<boolean> | boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Leave Request composables — TanStack Query wrappers.
//
// All five mutations (create / update / delete / approve / reject)
// invalidate leaveRequestQueryKeys.all on success. After a manager
// approves a request, the detail page refetches (entering "decided"
// mode in the template) AND any open list refreshes the row's status
// badge in one operation.
//
// Mutations DO NOT swallow errors. 401 / 403 / 404 / 422 propagate to
// the page layer:
//   - 422 with errors.field[] → form's setErrors (same as Employees)
//   - 422 with error_code='invalid_transition' → page toast + refetch
//     (row state changed under the user; show the new state)
//   - 403 → forbidden banner; 401 → redirect to login via the global
//     interceptor in shared/api/client.ts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paginated leave-request list. Reactive params — TanStack refetches
 * automatically as filters change.
 *
 * Optional `options.enabled` gates whether the query fires at all.
 * Used by the HRM dashboard's approver-queue section to skip the
 * fetch when the user lacks hrm.leave_request.approve.
 */
export function useLeaveRequestsQuery(
    params: MaybeRefOrGetter<LeaveRequestListParams> = () => ({}),
    options: UseLeaveRequestsQueryOptions = {},
) {
    return useQuery({
        queryKey: computed(() => leaveRequestQueryKeys.list(toValue(params))),
        queryFn: () => leaveRequestsApi.listLeaveRequests(toValue(params)),
        staleTime: 30_000,
        enabled: options.enabled ?? true,
    });
}

/**
 * Single leave-request detail. `id` is reactive so a router param change
 * refetches without a remount. Disabled on falsy ids.
 */
export function useLeaveRequestQuery(id: MaybeRefOrGetter<number>) {
    return useQuery({
        queryKey: computed(() => leaveRequestQueryKeys.detail(toValue(id))),
        queryFn: () => leaveRequestsApi.getLeaveRequest(toValue(id)),
        staleTime: 30_000,
        enabled: computed(() => Number.isFinite(toValue(id)) && toValue(id) > 0),
    });
}

/**
 * Create. Caller invokes `mutate(payload)` from the form's submit
 * handler. onSuccess refreshes the list cache; the form is responsible
 * for navigation (success → push to detail page).
 */
export function useCreateLeaveRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateLeaveRequestRequest) =>
            leaveRequestsApi.createLeaveRequest(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: leaveRequestQueryKeys.all });
        },
    });
}

/**
 * Edit non-status fields. Same object-arg pattern as useUpdateEmployee.
 * Will surface 422 invalid_transition if the row isn't pending — the
 * caller must handle that error code distinctly from generic 422 field
 * errors.
 */
export function useUpdateLeaveRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateLeaveRequestRequest }) =>
            leaveRequestsApi.updateLeaveRequest(id, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: leaveRequestQueryKeys.all });
        },
    });
}

/**
 * Soft-delete. Allowed on decided rows too — the .delete permission is
 * the "created in error" affordance and doesn't depend on workflow state.
 */
export function useDeleteLeaveRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => leaveRequestsApi.deleteLeaveRequest(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: leaveRequestQueryKeys.all });
        },
    });
}

/**
 * Workflow transition: pending → approved. The note is optional; pass
 * an empty object or omit `note` if the manager didn't add one. Will
 * 422 invalid_transition on a non-pending row.
 */
export function useApproveLeaveRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload?: DecideLeaveRequestRequest }) =>
            leaveRequestsApi.approveLeaveRequest(id, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: leaveRequestQueryKeys.all });
        },
    });
}

/**
 * Workflow transition: pending → rejected. Mirror of approve.
 */
export function useRejectLeaveRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload?: DecideLeaveRequestRequest }) =>
            leaveRequestsApi.rejectLeaveRequest(id, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: leaveRequestQueryKeys.all });
        },
    });
}
