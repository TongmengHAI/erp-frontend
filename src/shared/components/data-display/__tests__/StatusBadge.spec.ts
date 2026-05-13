import { describe, expect, it } from 'vitest';

import StatusBadge from '@/shared/components/data-display/StatusBadge.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

describe('StatusBadge', () => {
    it('renders the label', async () => {
        const w = await mountWithGlobals(StatusBadge, {
            props: { severity: 'success', label: 'Posted' },
        });
        expect(w.text()).toBe('Posted');
    });

    it('applies the right semantic classes per severity', async () => {
        const w = await mountWithGlobals(StatusBadge, {
            props: { severity: 'danger', label: 'Reversed' },
        });
        const span = w.find('span');
        expect(span.classes()).toContain('bg-danger-bg');
        expect(span.classes()).toContain('text-danger-text');
    });

    it('neutral severity uses surface-sunken background', async () => {
        const w = await mountWithGlobals(StatusBadge, {
            props: { severity: 'neutral', label: 'Archived' },
        });
        expect(w.find('span').classes()).toContain('bg-surface-sunken');
    });
});
