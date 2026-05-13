import { describe, expect, it } from 'vitest';

import FilterBar from '@/shared/components/layout/FilterBar.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

describe('FilterBar', () => {
    it('renders default slot content', async () => {
        const wrapper = await mountWithGlobals(FilterBar, {
            slots: { default: '<input class="probe" />' },
        });
        expect(wrapper.find('.probe').exists()).toBe(true);
    });

    it('applies sticky positioning classes when sticky=true', async () => {
        const sticky = await mountWithGlobals(FilterBar, { props: { sticky: true } });
        expect(sticky.element.className).toContain('sticky');
        expect(sticky.element.className).toContain('top-0');

        const nonSticky = await mountWithGlobals(FilterBar);
        expect(nonSticky.element.className).not.toContain('sticky');
    });
});
