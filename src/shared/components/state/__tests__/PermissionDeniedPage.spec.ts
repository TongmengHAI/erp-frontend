import { describe, expect, it } from 'vitest';

import PermissionDeniedPage from '@/shared/components/state/PermissionDeniedPage.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

describe('PermissionDeniedPage', () => {
    it('renders default title and description from i18n', async () => {
        const wrapper = await mountWithGlobals(PermissionDeniedPage);
        expect(wrapper.find('h1').text()).toBe("You don't have access");
        expect(wrapper.text()).toContain("You don't have permission to view this page.");
    });

    it('uses descriptionWithResource when `resource` prop is provided', async () => {
        const wrapper = await mountWithGlobals(PermissionDeniedPage, {
            props: { resource: 'Journal Entries' },
        });
        expect(wrapper.text()).toContain("You don't have permission to view Journal Entries.");
    });

    it('renders default action button targeting the dashboard route', async () => {
        const wrapper = await mountWithGlobals(PermissionDeniedPage);
        // The component uses custom RouterLink + Button. The button is the only one.
        expect(wrapper.findAll('button').length).toBe(1);
        expect(wrapper.find('button').text()).toContain('Go to dashboard');
    });

    it('actions slot overrides the default button', async () => {
        const wrapper = await mountWithGlobals(PermissionDeniedPage, {
            slots: { actions: '<button class="probe">Contact support</button>' },
        });
        expect(wrapper.find('.probe').exists()).toBe(true);
        expect(wrapper.findAll('button').length).toBe(1);
    });
});
