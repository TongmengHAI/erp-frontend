import { describe, expect, it } from 'vitest';

import { attendanceQueryKeys } from '@/modules/hrm/composables/attendanceQueryKeys';

// ─────────────────────────────────────────────────────────────────────────────
// attendanceQueryKeys — small but load-bearing.
//
// Mutations invalidate by .all. If the shape drifts, mutation
// invalidation silently stops refreshing list/detail caches and the UI
// shows stale rows after writes. Same regression-protection precedent
// as employee / department / leaveRequest key specs.
// ─────────────────────────────────────────────────────────────────────────────

describe('attendanceQueryKeys', () => {
    it('all is the array root every other key extends', () => {
        expect(attendanceQueryKeys.all).toEqual(['attendance']);
    });

    it('list keys include the params snapshot so distinct filters cache separately', () => {
        const present = attendanceQueryKeys.list({ status: 'present' });
        const absent = attendanceQueryKeys.list({ status: 'absent' });
        const window = attendanceQueryKeys.list({ from: '2026-05-01', to: '2026-05-31' });
        const empty = attendanceQueryKeys.list();

        expect(present).toEqual(['attendance', 'list', { status: 'present' }]);
        expect(absent).toEqual(['attendance', 'list', { status: 'absent' }]);
        expect(window).toEqual(['attendance', 'list', { from: '2026-05-01', to: '2026-05-31' }]);
        expect(empty).toEqual(['attendance', 'list', {}]);
    });

    it('detail keys extend .all + include the numeric id', () => {
        expect(attendanceQueryKeys.detail(42)).toEqual(['attendance', 'detail', 42]);
    });

    it('every key starts with the .all prefix (invalidate by .all refreshes everything)', () => {
        const list = attendanceQueryKeys.list();
        const detail = attendanceQueryKeys.detail(1);
        expect(list[0]).toBe('attendance');
        expect(detail[0]).toBe('attendance');
    });
});
