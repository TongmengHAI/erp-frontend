import { describe, expect, it } from 'vitest';

import { departmentQueryKeys } from '@/modules/hrm/composables/departmentQueryKeys';

// ─────────────────────────────────────────────────────────────────────────────
// departmentQueryKeys — mirror of employeeQueryKeys.spec. Locks the cache
// topology so a key-shape refactor produces test failures instead of silent
// cache misses.
// ─────────────────────────────────────────────────────────────────────────────

describe('departmentQueryKeys', () => {
    it('all is the array root every other key extends', () => {
        expect(departmentQueryKeys.all).toEqual(['departments']);
    });

    it('list keys include the params snapshot so distinct filters cache separately', () => {
        const k1 = departmentQueryKeys.list({ status: 'active', page: 1 });
        const k2 = departmentQueryKeys.list({ status: 'archived', page: 1 });
        const kEmpty = departmentQueryKeys.list();
        expect(k1).toEqual(['departments', 'list', { status: 'active', page: 1 }]);
        expect(k2).toEqual(['departments', 'list', { status: 'archived', page: 1 }]);
        expect(kEmpty).toEqual(['departments', 'list', {}]);
    });

    it('detail keys extend .all + include the numeric id', () => {
        expect(departmentQueryKeys.detail(42)).toEqual(['departments', 'detail', 42]);
    });

    it('every key starts with the .all prefix (invalidate by .all refreshes everything)', () => {
        const list = departmentQueryKeys.list();
        const detail = departmentQueryKeys.detail(1);
        expect(list[0]).toBe('departments');
        expect(detail[0]).toBe('departments');
    });
});
