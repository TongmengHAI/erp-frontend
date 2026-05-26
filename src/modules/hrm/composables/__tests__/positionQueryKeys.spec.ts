import { describe, expect, it } from 'vitest';

import { positionQueryKeys } from '@/modules/hrm/composables/positionQueryKeys';

// ─────────────────────────────────────────────────────────────────────────────
// positionQueryKeys — small but load-bearing. Mutations invalidate by
// .all; if the shape drifts, mutations silently stop refreshing caches.
// ─────────────────────────────────────────────────────────────────────────────

describe('positionQueryKeys', () => {
    it('all is the array root every other key extends', () => {
        expect(positionQueryKeys.all).toEqual(['positions']);
    });

    it('list keys include the params snapshot so distinct filters cache separately', () => {
        const active = positionQueryKeys.list({ status: 'active' });
        const archived = positionQueryKeys.list({ status: 'archived' });
        const empty = positionQueryKeys.list();
        expect(active).toEqual(['positions', 'list', { status: 'active' }]);
        expect(archived).toEqual(['positions', 'list', { status: 'archived' }]);
        expect(empty).toEqual(['positions', 'list', {}]);
    });

    it('detail keys extend .all + include the numeric id', () => {
        expect(positionQueryKeys.detail(42)).toEqual(['positions', 'detail', 42]);
    });

    it('every key starts with the .all prefix', () => {
        expect(positionQueryKeys.list()[0]).toBe('positions');
        expect(positionQueryKeys.detail(1)[0]).toBe('positions');
    });
});
