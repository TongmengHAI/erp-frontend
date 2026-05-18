import { describe, expect, it } from 'vitest';

import { employeeQueryKeys } from '@/modules/hrm/composables/employeeQueryKeys';

// ─────────────────────────────────────────────────────────────────────────────
// employeeQueryKeys — small but load-bearing.
//
// Mutations invalidate by .all; lists and details key off the same root.
// If any of these shapes drift, mutation invalidation silently stops
// refreshing list/detail caches and the UI shows stale rows after writes.
// This is the test that fails loudly when someone "improves" the keys.
// ─────────────────────────────────────────────────────────────────────────────

describe('employeeQueryKeys', () => {
    it('all is the array root every other key extends', () => {
        expect(employeeQueryKeys.all).toEqual(['employees']);
    });

    it('list keys include the params snapshot so distinct filters cache separately', () => {
        const k1 = employeeQueryKeys.list({ status: 'active', page: 1 });
        const k2 = employeeQueryKeys.list({ status: 'on_leave', page: 1 });
        const kEmpty = employeeQueryKeys.list();
        expect(k1).toEqual(['employees', 'list', { status: 'active', page: 1 }]);
        expect(k2).toEqual(['employees', 'list', { status: 'on_leave', page: 1 }]);
        expect(kEmpty).toEqual(['employees', 'list', {}]);
    });

    it('detail keys extend .all + include the numeric id', () => {
        expect(employeeQueryKeys.detail(42)).toEqual(['employees', 'detail', 42]);
    });

    it('every key starts with the .all prefix (invalidate by .all refreshes everything)', () => {
        const list = employeeQueryKeys.list();
        const detail = employeeQueryKeys.detail(1);
        expect(list[0]).toBe('employees');
        expect(detail[0]).toBe('employees');
    });
});
