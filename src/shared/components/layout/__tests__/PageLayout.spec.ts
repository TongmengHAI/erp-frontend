import { describe, expect, it } from 'vitest';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

describe('PageLayout', () => {
    it('renders as <main> with the standard max-width by default', async () => {
        const wrapper = await mountWithGlobals(PageLayout, {
            slots: { default: '<div data-test="body">body</div>' },
        });

        const main = wrapper.find('main');
        expect(main.exists()).toBe(true);
        expect(main.classes()).toContain('max-w-[1440px]');
        expect(wrapper.find('[data-test="body"]').exists()).toBe(true);
    });

    it('applies the narrow max-width when width="narrow"', async () => {
        const wrapper = await mountWithGlobals(PageLayout, {
            props: { width: 'narrow' },
        });
        expect(wrapper.find('main').classes()).toContain('max-w-[960px]');
        expect(wrapper.find('main').classes()).not.toContain('max-w-[1440px]');
    });

    it('renders default slot content', async () => {
        const wrapper = await mountWithGlobals(PageLayout, {
            slots: { default: '<span class="probe">child text</span>' },
        });
        expect(wrapper.find('.probe').text()).toBe('child text');
    });
});
