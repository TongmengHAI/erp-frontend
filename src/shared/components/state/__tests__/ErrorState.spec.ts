import { describe, expect, it } from 'vitest';

import ErrorState from '@/shared/components/state/ErrorState.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

describe('ErrorState', () => {
    it('renders default title and description from i18n', async () => {
        const wrapper = await mountWithGlobals(ErrorState);
        expect(wrapper.find('h3').text()).toBe('Something went wrong');
        expect(wrapper.text()).toContain('Please try again');
    });

    it('custom title and description override defaults', async () => {
        const wrapper = await mountWithGlobals(ErrorState, {
            props: { title: 'Custom title', description: 'Custom description.' },
        });
        expect(wrapper.find('h3').text()).toBe('Custom title');
        expect(wrapper.text()).toContain('Custom description.');
    });

    it('default retry button emits retry event when clicked', async () => {
        const wrapper = await mountWithGlobals(ErrorState);
        await wrapper.find('button').trigger('click');
        expect(wrapper.emitted('retry')).toBeTruthy();
        expect(wrapper.emitted('retry')).toHaveLength(1);
    });

    it('actions slot replaces the default retry button', async () => {
        const wrapper = await mountWithGlobals(ErrorState, {
            slots: { actions: '<button class="probe">Reload</button>' },
        });
        expect(wrapper.find('.probe').exists()).toBe(true);
        // Should be the only button rendered (no default retry).
        expect(wrapper.findAll('button').length).toBe(1);
    });
});
