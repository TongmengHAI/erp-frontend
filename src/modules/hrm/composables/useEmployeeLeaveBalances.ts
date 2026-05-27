import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery } from '@tanstack/vue-query';

import * as leaveBalancesApi from '@/modules/hrm/api/leaveBalances';
import { leaveBalanceQueryKeys } from '@/modules/hrm/composables/leaveBalanceQueryKeys';

// ─────────────────────────────────────────────────────────────────────────────
// useEmployeeLeaveBalancesQuery — dedicated TanStack Query wrapper for the
// EmployeeDetailPage "Leave Balances" card.
//
// Why a separate composable rather than calling useLeaveBalancesQuery
// directly:
//
//   1. OWN QUERY KEY. The card uses leaveBalanceQueryKeys.byEmployee()
//      — a distinct subtree from the list page's .list keys. Same root
//      (.all) so mutations still cascade-invalidate; distinct shape so
//      the two surfaces' caches don't collide. If the list page filters
//      to the same employee + same year, the two queries fetch
//      independently with their own staleTime tunings.
//
//   2. LONGER staleTime. The card is informational (the user is on
//      EmployeeDetailPage looking at the EMPLOYEE, not the balance —
//      stale-ish balance data is acceptable for 60s). The list page's
//      30s default applies when the user is ACTIVELY managing balances.
//      Different contexts → different freshness budgets.
//
//   3. SCOPED INVARIANT. The card always queries per_page=100 because
//      no SME tenant has more than ~5 balance rows per employee per year
//      (2 allocated types × N years × 1 employee = a handful). The cap
//      is generous insurance; the list page exposes a per_page filter
//      because it browses across employees and years.
//
// `enabled` guards against firing when the page is in its loading or
// error states (employeeId would be 0 or NaN). Same convention as
// useLeaveBalanceQuery for the single-row detail.
// ─────────────────────────────────────────────────────────────────────────────

export function useEmployeeLeaveBalancesQuery(
    employeeId: MaybeRefOrGetter<number>,
    periodYear: MaybeRefOrGetter<number>,
) {
    return useQuery({
        queryKey: computed(() =>
            leaveBalanceQueryKeys.byEmployee(toValue(employeeId), toValue(periodYear)),
        ),
        queryFn: () => leaveBalancesApi.listLeaveBalances({
            employee_id: toValue(employeeId),
            period_year: toValue(periodYear),
            per_page: 100,
        }),
        // 60s — see #2 in the file header. The card is informational;
        // managing-the-balance flows live on the dedicated list/detail
        // pages and own their own cache (30s).
        staleTime: 60_000,
        enabled: computed(() =>
            Number.isFinite(toValue(employeeId))
            && toValue(employeeId) > 0
            && Number.isFinite(toValue(periodYear))
            && toValue(periodYear) >= 2000
        ),
    });
}
