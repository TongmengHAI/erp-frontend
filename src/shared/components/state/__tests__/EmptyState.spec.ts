import { describe, expect, it } from 'vitest';

import EmptyState from '@/shared/components/state/EmptyState.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

describe('EmptyState', () => {
    it('renders title and default icon', async () => {
        const wrapper = await mountWithGlobals(EmptyState, {
            props: { title: 'Nothing here yet' },
        });
        expect(wrapper.find('h3').text()).toBe('Nothing here yet');
        expect(wrapper.find('i').classes()).toContain('pi-inbox');
    });

    it('renders description when provided', async () => {
        const wrapper = await mountWithGlobals(EmptyState, {
            props: { title: 'No entries', description: 'Create one to get started.' },
        });
        expect(wrapper.text()).toContain('Create one to get started.');
    });

    it('renders actions slot when provided', async () => {
        const wrapper = await mountWithGlobals(EmptyState, {
            props: { title: 'No entries' },
            slots: { actions: '<button class="probe">Create</button>' },
        });
        expect(wrapper.find('.probe').exists()).toBe(true);
    });

    it('custom icon prop overrides the default', async () => {
        const wrapper = await mountWithGlobals(EmptyState, {
            props: { title: 't', icon: 'pi pi-folder' },
        });
        expect(wrapper.find('i').classes()).toContain('pi-folder');
        expect(wrapper.find('i').classes()).not.toContain('pi-inbox');
    });
});
