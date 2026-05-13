import { describe, expect, it } from 'vitest';

import LoadingState from '@/shared/components/state/LoadingState.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

describe('LoadingState', () => {
    it('list variant renders `rows` Skeletons (default 5)', async () => {
        const wrapper = await mountWithGlobals(LoadingState);
        // PV Skeleton mounts as a div with the "p-skeleton" class.
        const bars = wrapper.findAll('.p-skeleton');
        expect(bars.length).toBe(5);
    });

    it('list variant respects custom rows prop', async () => {
        const wrapper = await mountWithGlobals(LoadingState, { props: { rows: 8 } });
        expect(wrapper.findAll('.p-skeleton').length).toBe(8);
    });

    it('detail variant renders title + 3 paragraph bars + 1 block (5 total)', async () => {
        const wrapper = await mountWithGlobals(LoadingState, { props: { variant: 'detail' } });
        expect(wrapper.findAll('.p-skeleton').length).toBe(5);
    });

    it('card variant renders title + 2 paragraph bars (3 total)', async () => {
        const wrapper = await mountWithGlobals(LoadingState, { props: { variant: 'card' } });
        expect(wrapper.findAll('.p-skeleton').length).toBe(3);
    });
});
