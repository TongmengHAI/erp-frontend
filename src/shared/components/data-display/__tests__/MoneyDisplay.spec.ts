import { describe, expect, it } from 'vitest';

import MoneyDisplay from '@/shared/components/data-display/MoneyDisplay.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

describe('MoneyDisplay', () => {
    it('renders formatted USD', async () => {
        const w = await mountWithGlobals(MoneyDisplay, {
            props: { amount: '1234.56', currency: 'USD', locale: 'en-US' },
        });
        expect(w.text()).toContain('1,234.56');
        expect(w.text()).toContain('$');
    });

    it('applies right-aligned class by default', async () => {
        const w = await mountWithGlobals(MoneyDisplay, {
            props: { amount: '100', currency: 'USD', locale: 'en-US' },
        });
        expect(w.find('span').classes()).toContain('text-right');
    });

    it('honors align="left"', async () => {
        const w = await mountWithGlobals(MoneyDisplay, {
            props: { amount: '100', currency: 'USD', locale: 'en-US', align: 'left' },
        });
        expect(w.find('span').classes()).toContain('text-left');
    });

    it('uses tabular-nums for column alignment', async () => {
        const w = await mountWithGlobals(MoneyDisplay, {
            props: { amount: '100', currency: 'USD', locale: 'en-US' },
        });
        expect(w.find('span').classes()).toContain('tabular-nums');
    });
});
