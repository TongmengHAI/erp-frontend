import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';

import * as hrmSettingsApi from '@/modules/admin/api/hrmSettings';
import { hrmSettingsQueryKeys } from '@/modules/admin/composables/hrmSettingsQueryKeys';
import type {
    HrmSettingsShowParams,
    UpdateHrmSettingsRequest,
} from '@/modules/admin/types/hrmSettings';

// ─────────────────────────────────────────────────────────────────────────────
// HRM Settings composables — TanStack Query wrappers.
//
// useHrmSettingsQuery is reactive to its params (company_id). The
// company picker writes the URL via useUrlNumericFilter; the page
// derives a `MaybeRefOrGetter<HrmSettingsShowParams>` from the URL
// value and passes it in — TanStack refetches automatically when the
// key changes.
//
// useUpdateHrmSettings invalidates hrmSettingsQueryKeys.all on
// success so any open detail pane refreshes.
// ─────────────────────────────────────────────────────────────────────────────

export function useHrmSettingsQuery(
    params: MaybeRefOrGetter<HrmSettingsShowParams> = () => ({}),
) {
    return useQuery({
        queryKey: computed(() => hrmSettingsQueryKeys.detail(toValue(params))),
        queryFn: () => hrmSettingsApi.getHrmSettings(toValue(params)),
        staleTime: 30_000,
    });
}

export function useUpdateHrmSettings() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateHrmSettingsRequest }) =>
            hrmSettingsApi.updateHrmSettings(id, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: hrmSettingsQueryKeys.all });
        },
    });
}
