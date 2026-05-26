import { describe, expect, it } from 'vitest';

import { branchQueryKeys } from '@/modules/hrm/composables/branchQueryKeys';

// ─────────────────────────────────────────────────────────────────────────────
// branchQueryKeys — small but load-bearing. Mutations invalidate by
// .all; if the shape drifts, mutations silently stop refreshing caches.
// ─────────────────────────────────────────────────────────────────────────────

describe('branchQueryKeys', () => {
    it('all is the array root every other key extends', () => {
        expect(branchQueryKeys.all).toEqual(['branches']);
    });

    it('list keys include the params snapshot so distinct filters cache separately', () => {
        const active = branchQueryKeys.list({ status: 'active' });
        const archived = branchQueryKeys.list({ status: 'archived' });
        const empty = branchQueryKeys.list();
        expect(active).toEqual(['branches', 'list', { status: 'active' }]);
        expect(archived).toEqual(['branches', 'list', { status: 'archived' }]);
        expect(empty).toEqual(['branches', 'list', {}]);
    });

    it('detail keys extend .all + include the numeric id', () => {
        expect(branchQueryKeys.detail(42)).toEqual(['branches', 'detail', 42]);
    });

    it('every key starts with the .all prefix', () => {
        expect(branchQueryKeys.list()[0]).toBe('branches');
        expect(branchQueryKeys.detail(1)[0]).toBe('branches');
    });
});
