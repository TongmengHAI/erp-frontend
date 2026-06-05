import { describe, expect, it } from 'vitest';
import type { RouteRecordRaw } from 'vue-router';

import InvitationInvalidPage from '@/modules/invitations/pages/InvitationInvalidPage.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// InvitationInvalidPage — 4 distinct LOAD-BEARING variants.
//
// One test per error_code. Each verifies:
//   • The page renders with the test-id specific to that variant
//     (the container element carries `invitation-invalid-{code}`)
//   • The localized title appears in the rendered text
//   • Only the 'accepted' variant exposes the "Sign in instead" CTA;
//     the other three render a footer note instead
// ─────────────────────────────────────────────────────────────────────────────

const ROUTES: RouteRecordRaw[] = [
    { path: '/', name: 'home', component: { template: '<div />' } },
    { path: '/login', name: 'login', component: { template: '<div />' } },
];

describe('InvitationInvalidPage — variant rendering per error_code', () => {
    it('LOAD-BEARING: token_invalid renders the invalid-link variant + footer (no CTA)', async () => {
        const w = await mountWithGlobals(InvitationInvalidPage, {
            props: { errorCode: 'token_invalid' },
            routes: ROUTES,
        });

        expect(w.find('[data-testid="invitation-invalid-token_invalid"]').exists()).toBe(true);
        expect(w.find('[data-testid="invitation-invalid-accepted-cta"]').exists()).toBe(false);
        expect(w.find('[data-testid="invitation-invalid-token_invalid-footer"]').exists()).toBe(true);
        expect(w.text()).toContain('Invitation link not valid');
    });

    it('LOAD-BEARING: expired renders the expired variant + footer (no CTA)', async () => {
        const w = await mountWithGlobals(InvitationInvalidPage, {
            props: { errorCode: 'expired' },
            routes: ROUTES,
        });

        expect(w.find('[data-testid="invitation-invalid-expired"]').exists()).toBe(true);
        expect(w.find('[data-testid="invitation-invalid-accepted-cta"]').exists()).toBe(false);
        expect(w.find('[data-testid="invitation-invalid-expired-footer"]').exists()).toBe(true);
        expect(w.text()).toContain('Invitation expired');
    });

    it('LOAD-BEARING: cancelled renders the cancelled variant + footer (no CTA)', async () => {
        const w = await mountWithGlobals(InvitationInvalidPage, {
            props: { errorCode: 'cancelled' },
            routes: ROUTES,
        });

        expect(w.find('[data-testid="invitation-invalid-cancelled"]').exists()).toBe(true);
        expect(w.find('[data-testid="invitation-invalid-accepted-cta"]').exists()).toBe(false);
        expect(w.find('[data-testid="invitation-invalid-cancelled-footer"]').exists()).toBe(true);
        expect(w.text()).toContain('Invitation cancelled');
    });

    it('LOAD-BEARING: accepted renders the accepted variant + the "Sign in" CTA (no footer)', async () => {
        // The accepted variant is the only one that exposes a forward-
        // path affordance — the user has credentials, they just need
        // to use the login flow.
        const w = await mountWithGlobals(InvitationInvalidPage, {
            props: { errorCode: 'accepted' },
            routes: ROUTES,
        });

        expect(w.find('[data-testid="invitation-invalid-accepted"]').exists()).toBe(true);
        expect(w.find('[data-testid="invitation-invalid-accepted-cta"]').exists()).toBe(true);
        expect(w.find('[data-testid="invitation-invalid-accepted-footer"]').exists()).toBe(false);
        expect(w.text()).toContain('Invitation already used');
    });
});
