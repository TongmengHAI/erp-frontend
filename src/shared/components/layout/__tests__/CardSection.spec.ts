import { describe, expect, it } from 'vitest';

import CardSection from '@/shared/components/layout/CardSection.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

describe('CardSection', () => {
    it('renders the title prop in an <h2> header', async () => {
        const wrapper = await mountWithGlobals(CardSection, {
            props: { title: 'Settings' },
            slots: { default: '<p>body</p>' },
        });
        expect(wrapper.find('h2').text()).toBe('Settings');
    });

    it('header slot overrides the title prop', async () => {
        const wrapper = await mountWithGlobals(CardSection, {
            props: { title: 'Ignored title' },
            slots: {
                header: '<div class="probe">custom header</div>',
                default: '<p>body</p>',
            },
        });
        expect(wrapper.find('.probe').text()).toBe('custom header');
        // The title prop's h2 should not render when the header slot is used.
        expect(wrapper.find('h2').exists()).toBe(false);
    });

    it('applies padded class by default and removes it when padded=false', async () => {
        const padded = await mountWithGlobals(CardSection, {
            slots: { default: '<div class="probe">x</div>' },
        });
        expect(padded.find('.probe').element.parentElement?.className).toContain('p-6');

        const unpadded = await mountWithGlobals(CardSection, {
            props: { padded: false },
            slots: { default: '<div class="probe">x</div>' },
        });
        expect(unpadded.find('.probe').element.parentElement?.className).not.toContain('p-6');
    });
});
