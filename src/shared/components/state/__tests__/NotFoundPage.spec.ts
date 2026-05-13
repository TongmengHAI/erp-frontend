import { describe, expect, it } from 'vitest';

import NotFoundPage from '@/shared/components/state/NotFoundPage.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

describe('NotFoundPage', () => {
    it('renders default title and description from i18n', async () => {
        const wrapper = await mountWithGlobals(NotFoundPage);
        expect(wrapper.find('h1').text()).toBe('Page not found');
        expect(wrapper.text()).toContain("This page doesn't exist");
    });

    it('renders the default "Go to dashboard" button', async () => {
        const wrapper = await mountWithGlobals(NotFoundPage);
        expect(wrapper.find('button').text()).toContain('Go to dashboard');
    });

    it('actions slot overrides the default button', async () => {
        const wrapper = await mountWithGlobals(NotFoundPage, {
            slots: { actions: '<a class="probe" href="#">Back home</a>' },
        });
        expect(wrapper.find('.probe').exists()).toBe(true);
        expect(wrapper.findAll('button').length).toBe(0);
    });
});
