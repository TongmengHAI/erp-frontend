import { describe, expect, it } from 'vitest';

import { leaveRequestQueryKeys } from '@/modules/hrm/composables/leaveRequestQueryKeys';

// ─────────────────────────────────────────────────────────────────────────────
// leaveRequestQueryKeys — small but load-bearing.
//
// Mutations (create / update / delete / approve / reject) invalidate by
// .all; lists and details key off the same root. If any of these shapes
// drift, mutation invalidation silently stops refreshing list/detail
// caches, and the UI shows stale rows after writes — most painfully
// AFTER an approve when the row's status should flip in the detail view.
// Same precedent as the employee/department key specs.
// ─────────────────────────────────────────────────────────────────────────────

describe('leaveRequestQueryKeys', () => {
    it('all is the array root every other key extends', () => {
        expect(leaveRequestQueryKeys.all).toEqual(['leaveRequests']);
    });

    it('list keys include the params snapshot so distinct filters cache separately', () => {
        const pending = leaveRequestQueryKeys.list({ status: 'pending' });
        const approved = leaveRequestQueryKeys.list({ status: 'approved' });
        const empty = leaveRequestQueryKeys.list();
        expect(pending).toEqual(['leaveRequests', 'list', { status: 'pending' }]);
        expect(approved).toEqual(['leaveRequests', 'list', { status: 'approved' }]);
        expect(empty).toEqual(['leaveRequests', 'list', {}]);
    });

    it('detail keys extend .all + include the numeric id', () => {
        expect(leaveRequestQueryKeys.detail(42)).toEqual(['leaveRequests', 'detail', 42]);
    });

    it('every key starts with the .all prefix (invalidate by .all refreshes everything)', () => {
        const list = leaveRequestQueryKeys.list();
        const detail = leaveRequestQueryKeys.detail(1);
        expect(list[0]).toBe('leaveRequests');
        expect(detail[0]).toBe('leaveRequests');
    });
});
