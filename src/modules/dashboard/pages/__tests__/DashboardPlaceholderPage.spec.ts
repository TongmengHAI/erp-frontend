import { describe, expect, it } from 'vitest';

import DashboardPlaceholderPage from '@/modules/dashboard/pages/DashboardPlaceholderPage.vue';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

describe('DashboardPlaceholderPage', () => {
    it('renders the greeting with the authenticated user name', async () => {
        const w = await mountWithGlobals(DashboardPlaceholderPage);
        const auth = useAuthStore();
        auth.$patch({
            user: {
                id: 1,
                name: 'Jane Bookkeeper',
                email: 'jane@acme.example',
                email_verified_at: null,
            },
        });
        await w.vm.$nextTick();

        expect(w.text()).toContain('Welcome back, Jane Bookkeeper.');
    });

    it('renders three placeholder cards with the locked titles', async () => {
        const w = await mountWithGlobals(DashboardPlaceholderPage);
        const text = w.text();
        expect(text).toContain('Recent activity');
        expect(text).toContain('Pending approvals');
        expect(text).toContain('Period status');
    });

    it('falls back to an empty name token when no user is loaded', async () => {
        // Defensive: route guard prevents reaching this page unauthenticated,
        // but the component itself must not crash if the store hasn't
        // hydrated yet (e.g. brief tick during route transition).
        const w = await mountWithGlobals(DashboardPlaceholderPage);
        // No $patch on the auth store — user stays null.
        // i18n still renders the template; name interpolation is empty.
        expect(w.text()).toContain('Welcome back,');
        // The "Coming soon" footer appears on every card regardless of state.
        const comingSoonOccurrences = w.text().split('Coming soon').length - 1;
        expect(comingSoonOccurrences).toBe(3);
    });
});
