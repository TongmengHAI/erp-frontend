import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';

import * as tenantsApi from '@/modules/super-admin/api/tenants';
import { tenantQueryKeys } from '@/modules/super-admin/composables/tenantQueryKeys';
import type {
    CreateTenantRequest,
    TenantListParams,
    UpdateTenantRequest,
} from '@/modules/super-admin/types/tenant';

// ─────────────────────────────────────────────────────────────────────────────
// Tenant composables — TanStack Query wrappers. Mirrors useEmployees /
// useBranches / etc. shape. All three mutations invalidate
// tenantQueryKeys.all on success.
// ─────────────────────────────────────────────────────────────────────────────

export function useTenantsQuery(
    params: MaybeRefOrGetter<TenantListParams> = () => ({}),
) {
    return useQuery({
        queryKey: computed(() => tenantQueryKeys.list(toValue(params))),
        queryFn: () => tenantsApi.listTenants(toValue(params)),
        staleTime: 30_000,
    });
}

export function useTenantQuery(id: MaybeRefOrGetter<number>) {
    return useQuery({
        queryKey: computed(() => tenantQueryKeys.detail(toValue(id))),
        queryFn: () => tenantsApi.getTenant(toValue(id)),
        staleTime: 30_000,
        enabled: computed(() => Number.isFinite(toValue(id)) && toValue(id) > 0),
    });
}

export function useCreateTenant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateTenantRequest) => tenantsApi.createTenant(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: tenantQueryKeys.all });
        },
    });
}

export function useUpdateTenant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateTenantRequest }) =>
            tenantsApi.updateTenant(id, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: tenantQueryKeys.all });
        },
    });
}
