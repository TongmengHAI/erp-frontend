import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';

import * as attendanceApi from '@/modules/hrm/api/attendance';
import { attendanceQueryKeys } from '@/modules/hrm/composables/attendanceQueryKeys';
import type {
    AttendanceListParams,
    CreateAttendanceRequest,
    UpdateAttendanceRequest,
} from '@/modules/hrm/types/attendance';

// ─────────────────────────────────────────────────────────────────────────────
// Attendance composables — TanStack Query wrappers.
//
// All three mutations invalidate attendanceQueryKeys.all on success.
// Mutations DO NOT swallow errors:
//   - 422 with errors.date carries the named-fields uniqueness message;
//     the form page surfaces it inline next to the date picker
//   - 422 with errors.clock_out carries the clock-order message; same
//     inline handling
//   - 422 with errors.{any} → setErrors() pattern from EmployeeFormPage
//   - 403 / 401 / 404 propagate to the page layer
// ─────────────────────────────────────────────────────────────────────────────

export function useAttendanceQuery(
    params: MaybeRefOrGetter<AttendanceListParams> = () => ({}),
) {
    return useQuery({
        queryKey: computed(() => attendanceQueryKeys.list(toValue(params))),
        queryFn: () => attendanceApi.listAttendance(toValue(params)),
        staleTime: 30_000,
    });
}

export function useAttendanceDetailQuery(id: MaybeRefOrGetter<number>) {
    return useQuery({
        queryKey: computed(() => attendanceQueryKeys.detail(toValue(id))),
        queryFn: () => attendanceApi.getAttendance(toValue(id)),
        staleTime: 30_000,
        enabled: computed(() => Number.isFinite(toValue(id)) && toValue(id) > 0),
    });
}

export function useCreateAttendance() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateAttendanceRequest) =>
            attendanceApi.createAttendance(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: attendanceQueryKeys.all });
        },
    });
}

export function useUpdateAttendance() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateAttendanceRequest }) =>
            attendanceApi.updateAttendance(id, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: attendanceQueryKeys.all });
        },
    });
}

export function useDeleteAttendance() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => attendanceApi.deleteAttendance(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: attendanceQueryKeys.all });
        },
    });
}
