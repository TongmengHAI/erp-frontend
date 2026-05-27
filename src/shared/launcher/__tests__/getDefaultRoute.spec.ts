import { describe, expect, it } from 'vitest';

import { getDefaultRoute } from '@/shared/launcher/getDefaultRoute';

// ─────────────────────────────────────────────────────────────────────────────
// getDefaultRoute — pure-function unit tests. No Pinia / no router /
// no Vue context. The function takes the user's permissions array and
// returns a RouteLocationRaw.
//
// Three branches:
//   1. User has hrm.* — lands on hrm.dashboard
//   2. User has no app permissions — lands on launcher (zero-card state)
//   3. (Future: other apps; not exercised here because the registry
//      only has HRM in v1)
//
// The registry is consulted in order — the first app the user has
// access to wins. That ordering is the contract; tests pin it.
// ─────────────────────────────────────────────────────────────────────────────

describe('getDefaultRoute', () => {
    it('returns hrm.dashboard when the user has any hrm.* permission', () => {
        expect(getDefaultRoute(['hrm.employee.view'])).toEqual({ name: 'hrm.dashboard' });
        expect(getDefaultRoute(['hrm.leave_balance.create', 'tenant.settings.manage']))
            .toEqual({ name: 'hrm.dashboard' });
    });

    it('returns launcher when the user has no hrm.* permissions', () => {
        // Tenant member with no app access at all — lands on launcher
        // (zero-card empty state explains the situation).
        expect(getDefaultRoute([])).toEqual({ name: 'launcher' });
    });

    it('returns launcher when the user has unrelated permissions but no hrm.*', () => {
        // Defensive: in v1, only hrm.* is recognised by the registry.
        // Accounting/inventory/etc. permissions exist but no registered
        // app — user lands on launcher rather than getting routed to a
        // non-existent app's dashboard.
        expect(getDefaultRoute(['accounting.journal_entry.view', 'inventory.item.view']))
            .toEqual({ name: 'launcher' });
    });

    it('treats an exact-match permission as access (canAny semantics)', () => {
        // The auth store's canAny() treats `'hrm'` (no dot) and
        // `'hrm.X.Y'` as equivalent for prefix-gate purposes. Same
        // logic mirrored here.
        expect(getDefaultRoute(['hrm'])).toEqual({ name: 'hrm.dashboard' });
    });

    it('does NOT match a permission that merely starts with the prefix string but on a different boundary', () => {
        // 'hrmx.foo' is NOT under the hrm.* namespace — string-startsWith
        // alone would false-positive. The implementation guards via the
        // dot separator check.
        expect(getDefaultRoute(['hrmx.foo'])).toEqual({ name: 'launcher' });
    });
});
