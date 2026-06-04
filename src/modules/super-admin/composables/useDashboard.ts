import { useQuery } from '@tanstack/vue-query';

import * as dashboardApi from '@/modules/super-admin/api/dashboard';

const dashboardQueryKeys = {
    all: ['super-admin', 'dashboard'] as const,
};

export function useDashboardQuery() {
    return useQuery({
        queryKey: dashboardQueryKeys.all,
        queryFn: () => dashboardApi.getDashboard(),
        // Dashboard data is refreshed on demand; the SA expects the
        // numbers to be reasonably current. 60s stale time matches the
        // backend's lack of caching — the dashboard endpoint itself is
        // an aggregation over hot tables.
        //
        // No `enabled` guard — the page's PermissionDeniedPage v-if
        // catches the non-SA case at the template level (defensive;
        // route guard normally catches it earlier). Conditional
        // queries via `enabled` have observer-subscription timing
        // quirks that we don't need here.
        staleTime: 60_000,
    });
}
