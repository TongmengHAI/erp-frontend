import { describe, expect, it } from 'vitest';

import DateDisplay from '@/shared/components/data-display/DateDisplay.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

describe('DateDisplay', () => {
    it('renders short format by default', async () => {
        const w = await mountWithGlobals(DateDisplay, {
            props: { date: '2026-05-12T08:00:00', locale: 'en-US' },
        });
        expect(w.text()).toMatch(/May 12, 2026/);
    });

    it('renders iso-date format', async () => {
        const w = await mountWithGlobals(DateDisplay, {
            props: { date: '2026-05-12T08:00:00', format: 'iso-date' },
        });
        expect(w.text()).toBe('2026-05-12');
    });

    it('renders long format with weekday', async () => {
        const w = await mountWithGlobals(DateDisplay, {
            props: { date: '2026-05-12T08:00:00', format: 'long', locale: 'en-US' },
        });
        expect(w.text()).toMatch(/Tuesday/);
    });

    it('accepts Date object directly', async () => {
        const d = new Date('2026-05-12T08:00:00');
        const w = await mountWithGlobals(DateDisplay, {
            props: { date: d, format: 'iso-date' },
        });
        expect(w.text()).toBe('2026-05-12');
    });
});
