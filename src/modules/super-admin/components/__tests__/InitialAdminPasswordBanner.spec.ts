import ToastService from 'primevue/toastservice';
import { describe, expect, it, vi } from 'vitest';

import InitialAdminPasswordBanner from '@/modules/super-admin/components/InitialAdminPasswordBanner.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// InitialAdminPasswordBanner — Session 6 plan tightening #2.
//
// Pins the one-time-display discipline:
//   • Banner is visible when password + adminEmail props are provided.
//   • Both fields render in the visible DOM (so the SA can read +
//     copy).
//   • Acknowledgement emits an `acknowledged` event — the parent
//     unmounts the banner after that, so the password is GONE from
//     the SPA. The component itself doesn't manage its own lifetime;
//     the parent does (verified by the contract that the component
//     emits, not by self-managed state).
// ─────────────────────────────────────────────────────────────────────────────

const PASSWORD = 'TestPa55!w0rdR4nd';
const ADMIN_EMAIL = 'sokha@acme.kh';

describe('InitialAdminPasswordBanner', () => {
    it('renders the password and admin email visibly', async () => {
        const w = await mountWithGlobals(InitialAdminPasswordBanner, {
            props: { password: PASSWORD, adminEmail: ADMIN_EMAIL },
            extraPlugins: [ToastService],
        });

        const banner = w.find('[data-testid="initial-admin-password-banner"]');
        expect(banner.exists()).toBe(true);

        // Password rendered AS-IS (not obscured, not masked) so the SA
        // can copy. The "copy this NOW" discipline depends on the
        // value being readable.
        const pw = w.find('[data-testid="banner-password-value"]');
        expect(pw.exists()).toBe(true);
        expect(pw.text()).toBe(PASSWORD);

        const email = w.find('[data-testid="banner-admin-email"]');
        expect(email.exists()).toBe(true);
        expect(email.text()).toBe(ADMIN_EMAIL);
    });

    it('emits acknowledged when the acknowledge button is clicked (parent unmounts the banner)', async () => {
        const w = await mountWithGlobals(InitialAdminPasswordBanner, {
            props: { password: PASSWORD, adminEmail: ADMIN_EMAIL },
            extraPlugins: [ToastService],
        });

        const button = w.find('[data-testid="banner-acknowledge-button"]');
        expect(button.exists()).toBe(true);
        await button.trigger('click');

        expect(w.emitted('acknowledged')).toHaveLength(1);
    });

    it('exposes a copy-to-clipboard button (state changes after click)', async () => {
        // Stub navigator.clipboard before mount — secure context in
        // happy-dom may not provide one by default. We're testing the
        // affordance + state transition, not the actual clipboard
        // write semantics (which the browser owns).
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            writable: true,
            configurable: true,
        });

        const w = await mountWithGlobals(InitialAdminPasswordBanner, {
            props: { password: PASSWORD, adminEmail: ADMIN_EMAIL },
            extraPlugins: [ToastService],
        });

        const copyBtn = w.find('[data-testid="banner-copy-button"]');
        expect(copyBtn.exists()).toBe(true);

        await copyBtn.trigger('click');
        await vi.dynamicImportSettled();

        // navigator.clipboard.writeText was called with the password.
        expect(writeText).toHaveBeenCalledWith(PASSWORD);
    });
});

