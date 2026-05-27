import { describe, expect, it } from 'vitest';

import { leaveBalanceQueryKeys } from '@/modules/hrm/composables/leaveBalanceQueryKeys';

// ─────────────────────────────────────────────────────────────────────────────
// leaveBalanceQueryKeys — small but load-bearing. Mutations invalidate
// by .all; if the shape drifts, mutations silently stop refreshing the
// list page AND the Session-3 EmployeeLeaveBalancesCard.
// ─────────────────────────────────────────────────────────────────────────────

describe('leaveBalanceQueryKeys', () => {
    it('all is the array root every other key extends', () => {
        expect(leaveBalanceQueryKeys.all).toEqual(['leave-balances']);
    });

    it('list keys include the params snapshot so distinct filters cache separately', () => {
        const employeeFiltered = leaveBalanceQueryKeys.list({ employee_id: 5 });
        const yearFiltered = leaveBalanceQueryKeys.list({ period_year: 2026 });
        const both = leaveBalanceQueryKeys.list({ employee_id: 5, period_year: 2026 });
        const empty = leaveBalanceQueryKeys.list();
        expect(employeeFiltered).toEqual(['leave-balances', 'list', { employee_id: 5 }]);
        expect(yearFiltered).toEqual(['leave-balances', 'list', { period_year: 2026 }]);
        expect(both).toEqual(['leave-balances', 'list', { employee_id: 5, period_year: 2026 }]);
        expect(empty).toEqual(['leave-balances', 'list', {}]);
    });

    it('detail keys extend .all + include the numeric id', () => {
        expect(leaveBalanceQueryKeys.detail(42)).toEqual(['leave-balances', 'detail', 42]);
    });

    it('byEmployee keys extend .all + carry employeeId + periodYear (distinct from .list)', () => {
        // Distinct shape from .list so the EmployeeDetailPage card and
        // a same-filtered list page don't share cache (different
        // contexts, different staleTime tunings). Still rooted at
        // .all so create/update/delete mutations cascade-invalidate.
        expect(leaveBalanceQueryKeys.byEmployee(5, 2026))
            .toEqual(['leave-balances', 'by-employee', 5, 2026]);
        expect(leaveBalanceQueryKeys.byEmployee(5, 2027))
            .toEqual(['leave-balances', 'by-employee', 5, 2027]);
    });

    it('every key starts with the .all prefix', () => {
        expect(leaveBalanceQueryKeys.list()[0]).toBe('leave-balances');
        expect(leaveBalanceQueryKeys.detail(1)[0]).toBe('leave-balances');
        expect(leaveBalanceQueryKeys.byEmployee(1, 2026)[0]).toBe('leave-balances');
    });
});
