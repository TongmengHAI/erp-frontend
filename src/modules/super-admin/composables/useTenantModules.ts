import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';

import * as tenantModulesApi from '@/modules/super-admin/api/tenantModules';
import { tenantQueryKeys } from '@/modules/super-admin/composables/tenantQueryKeys';
import type { SyncTenantModulesRequest } from '@/modules/super-admin/types/tenantModule';

// ─────────────────────────────────────────────────────────────────────────────
// Tenant modules composables — TanStack wrappers. Per §10.3 every read
// goes through useTenantModulesQuery so the editor + future displays
// (dashboard's "tenants per module" tile already aggregates server-side;
// future per-tenant detail surfaces would use this composable).
//
// Mutation invalidates both modules-by-tenant AND the tenants list +
// detail (a sync changes the tenant's entitled_modules array visible
// on the SA dashboard).
// ─────────────────────────────────────────────────────────────────────────────

const tenantModulesQueryKeys = {
    all: (tenantId: number) => ['super-admin', 'tenants', tenantId, 'modules'] as const,
};

export function useTenantModulesQuery(tenantId: MaybeRefOrGetter<number>) {
    return useQuery({
        queryKey: computed(() => tenantModulesQueryKeys.all(toValue(tenantId))),
        queryFn: () => tenantModulesApi.listTenantModules(toValue(tenantId)),
        staleTime: 30_000,
        enabled: computed(() => Number.isFinite(toValue(tenantId)) && toValue(tenantId) > 0),
    });
}

export function useSyncTenantModules() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            tenantId,
            payload,
        }: {
            tenantId: number;
            payload: SyncTenantModulesRequest;
        }) => tenantModulesApi.syncTenantModules(tenantId, payload),
        onSuccess: (_data, variables) => {
            void queryClient.invalidateQueries({
                queryKey: tenantModulesQueryKeys.all(variables.tenantId),
            });
            // Tenant list/detail can show entitlement chips in the
            // future — invalidate the broader tenant tree so they
            // refresh too.
            void queryClient.invalidateQueries({ queryKey: tenantQueryKeys.all });
        },
    });
}
