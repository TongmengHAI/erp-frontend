import { describe, expect, it } from 'vitest';

import PageHeader from '@/shared/components/layout/PageHeader.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

describe('PageHeader', () => {
    it('renders the title as an <h1>', async () => {
        const wrapper = await mountWithGlobals(PageHeader, {
            props: { title: 'Journal Entries' },
        });
        expect(wrapper.find('h1').text()).toBe('Journal Entries');
    });

    it('renders subtitle when provided', async () => {
        const wrapper = await mountWithGlobals(PageHeader, {
            props: { title: 't', subtitle: 'Manual JE posted to GL' },
        });
        expect(wrapper.text()).toContain('Manual JE posted to GL');
    });

    it('renders breadcrumbs nav when items provided', async () => {
        const wrapper = await mountWithGlobals(PageHeader, {
            props: {
                title: 't',
                breadcrumbs: [
                    { label: 'Home', to: { name: 'home' } },
                    { label: 'Accounting', to: { name: 'home' } },
                    { label: 'Journal Entries' },
                ],
            },
        });
        const nav = wrapper.find('nav[aria-label="Breadcrumb"]');
        expect(nav.exists()).toBe(true);
        expect(nav.findAll('li').length).toBe(3);
        // Last item has no `to` → renders as <span>, not RouterLink.
        const lastItem = nav.findAll('li').at(-1);
        expect(lastItem?.find('a').exists()).toBe(false);
    });

    it('omits breadcrumbs nav when breadcrumbs prop is absent', async () => {
        const wrapper = await mountWithGlobals(PageHeader, { props: { title: 't' } });
        expect(wrapper.find('nav[aria-label="Breadcrumb"]').exists()).toBe(false);
    });

    it('renders actions slot when provided', async () => {
        const wrapper = await mountWithGlobals(PageHeader, {
            props: { title: 't' },
            slots: { actions: '<button class="probe">Save</button>' },
        });
        expect(wrapper.find('.probe').exists()).toBe(true);
    });
});
