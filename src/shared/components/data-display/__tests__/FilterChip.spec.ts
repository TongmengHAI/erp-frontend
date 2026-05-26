import { describe, expect, it } from 'vitest';

import FilterChip from '@/shared/components/data-display/FilterChip.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

describe('FilterChip', () => {
    it('renders the supplied label text', async () => {
        const w = await mountWithGlobals(FilterChip, {
            props: { label: 'Filtered to: Operations', clearAriaLabel: 'Clear filter' },
        });
        expect(w.text()).toContain('Filtered to: Operations');
    });

    it('emits @clear when the [×] button is clicked', async () => {
        const w = await mountWithGlobals(FilterChip, {
            props: { label: 'Active filter', clearAriaLabel: 'Clear' },
        });
        await w.find('[data-testid="filter-chip-clear"]').trigger('click');
        expect(w.emitted('clear')).toHaveLength(1);
    });

    it('uses the supplied aria-label on the clear button', async () => {
        const w = await mountWithGlobals(FilterChip, {
            props: {
                label: 'X',
                clearAriaLabel: 'Remove department filter',
            },
        });
        const btn = w.find('[data-testid="filter-chip-clear"]');
        expect(btn.attributes('aria-label')).toBe('Remove department filter');
    });

    it('defaults the leading icon to pi-filter', async () => {
        const w = await mountWithGlobals(FilterChip, {
            props: { label: 'X', clearAriaLabel: 'Clear' },
        });
        // The first <i> inside the span is the leading icon (the [×]
        // icon is inside the button, after it).
        const leadingIcon = w.find('span > i');
        expect(leadingIcon.classes()).toContain('pi-filter');
    });

    it('accepts a custom leading icon class', async () => {
        const w = await mountWithGlobals(FilterChip, {
            props: { label: 'X', clearAriaLabel: 'Clear', icon: 'pi pi-tag' },
        });
        const leadingIcon = w.find('span > i');
        expect(leadingIcon.classes()).toContain('pi-tag');
        expect(leadingIcon.classes()).not.toContain('pi-filter');
    });
});
