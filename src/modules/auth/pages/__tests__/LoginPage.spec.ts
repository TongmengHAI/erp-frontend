import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as authApi from '@/modules/auth/api/auth';
import LoginPage from '@/modules/auth/pages/LoginPage.vue';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// LoginPage — submit flow + error UX.
//
// We mock the auth API module so the page exercises its own happy/sad paths
// without an HTTP layer. mountWithGlobals supplies a memory-history router
// (LoginPage doesn't need real navigation targets — it just calls
// router.push and we observe the call).
// ─────────────────────────────────────────────────────────────────────────────

function fillField(w: Awaited<ReturnType<typeof mountWithGlobals>>, name: string, value: string) {
    // FormField's slot input has data-testid; alternatively find by name attr.
    const input = w.find(`input[name="${name}"]`);
    return input.setValue(value);
}

function buildAxiosError(status: number, body: unknown, headers: Record<string, string> = {}) {
    return Object.assign(new Error(`HTTP ${status}`), {
        isAxiosError: true,
        response: { status, data: body, headers },
    });
}

describe('LoginPage', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders email + password fields and a submit button', async () => {
        const w = await mountWithGlobals(LoginPage);
        expect(w.find('[data-testid="login-email"]').exists()).toBe(true);
        expect(w.find('[data-testid="login-password"]').exists()).toBe(true);
        expect(w.find('[data-testid="login-submit"]').exists()).toBe(true);
    });

    it('submits credentials and routes to / on success (no ?redirect)', async () => {
        vi.spyOn(authApi, 'login').mockResolvedValue({
            data: {
                user: {
                    id: 1,
                    name: 'X',
                    email: 'x@example.test',
                    email_verified_at: null,
                },
                tenant: {
                    id: 1,
                    slug: 'x',
                    name: 'X Co',
                    country_code: 'KH',
                    default_currency: 'USD',
                    functional_currency: 'USD',
                    timezone: 'Asia/Phnom_Penh',
                },
            },
        });
        vi.spyOn(authApi, 'me').mockResolvedValue({
            data: {
                user: {
                    id: 1,
                    name: 'X',
                    email: 'x@example.test',
                    email_verified_at: null,
                },
                tenant: {
                    id: 1,
                    slug: 'x',
                    name: 'X Co',
                    country_code: 'KH',
                    default_currency: 'USD',
                    functional_currency: 'USD',
                    timezone: 'Asia/Phnom_Penh',
                },
                roles: [],
                permissions: [],
            },
        });

        const w = await mountWithGlobals(LoginPage);
        await fillField(w, 'email', 'x@example.test');
        await fillField(w, 'password', 'secret123');
        await flushPromises();
        await w.find('form').trigger('submit');
        // Multi-tick chain: VeeValidate validate → onSubmit await login →
        // (success path: await fetchMe → state $patch → router.push) or
        // (error path: setErrors/formError → isSubmitting flips → re-render).
        // flushPromises only drains microtasks; we also need timer-task
        // boundaries that the chain crosses.
        await new Promise((r) => setTimeout(r, 50));
        await flushPromises();

        const auth = useAuthStore();
        expect(auth.user?.email).toBe('x@example.test');
        // No form-level error banner on success.
        expect(w.find('[data-testid="login-form-error"]').exists()).toBe(false);
    });

    it('maps 422 field errors to FormField error messages', async () => {
        vi.spyOn(authApi, 'login').mockRejectedValue(
            buildAxiosError(422, {
                message: 'The given data was invalid.',
                errors: {
                    email: ['Must be a valid email address.'],
                    password: ['Required.'],
                },
            }),
        );

        const w = await mountWithGlobals(LoginPage);
        await fillField(w, 'email', 'x@example.test');
        await fillField(w, 'password', 'secret');
        await flushPromises();
        await w.find('form').trigger('submit');
        // Multi-tick chain: VeeValidate validate → onSubmit await login →
        // (success path: await fetchMe → state $patch → router.push) or
        // (error path: setErrors/formError → isSubmitting flips → re-render).
        // flushPromises only drains microtasks; we also need timer-task
        // boundaries that the chain crosses.
        await new Promise((r) => setTimeout(r, 50));
        await flushPromises();

        // VeeValidate surfaces the error under each field's [role=alert].
        const text = w.text();
        expect(text).toContain('Must be a valid email address.');
        expect(text).toContain('Required.');
        // 422 should NOT raise the form-level banner.
        expect(w.find('[data-testid="login-form-error"]').exists()).toBe(false);
    });

    it('surfaces 401 as a form-level banner without field hints', async () => {
        vi.spyOn(authApi, 'login').mockRejectedValue(
            buildAxiosError(401, {
                message: 'These credentials do not match our records.',
            }),
        );

        const w = await mountWithGlobals(LoginPage);
        await fillField(w, 'email', 'x@example.test');
        await fillField(w, 'password', 'secret');
        await flushPromises();
        await w.find('form').trigger('submit');
        // Multi-tick chain: VeeValidate validate → onSubmit await login →
        // (success path: await fetchMe → state $patch → router.push) or
        // (error path: setErrors/formError → isSubmitting flips → re-render).
        // flushPromises only drains microtasks; we also need timer-task
        // boundaries that the chain crosses.
        await new Promise((r) => setTimeout(r, 50));
        await flushPromises();

        const banner = w.find('[data-testid="login-form-error"]');
        expect(banner.exists()).toBe(true);
        expect(banner.text()).toContain('Invalid email or password');
    });

    it('surfaces 429 as a rate-limit banner with the Retry-After seconds', async () => {
        vi.spyOn(authApi, 'login').mockRejectedValue(
            buildAxiosError(429, { message: 'Too Many Attempts.' }, { 'retry-after': '45' }),
        );

        const w = await mountWithGlobals(LoginPage);
        await fillField(w, 'email', 'x@example.test');
        await fillField(w, 'password', 'secret');
        await flushPromises();
        await w.find('form').trigger('submit');
        // Multi-tick chain: VeeValidate validate → onSubmit await login →
        // (success path: await fetchMe → state $patch → router.push) or
        // (error path: setErrors/formError → isSubmitting flips → re-render).
        // flushPromises only drains microtasks; we also need timer-task
        // boundaries that the chain crosses.
        await new Promise((r) => setTimeout(r, 50));
        await flushPromises();

        const banner = w.find('[data-testid="login-form-error"]');
        expect(banner.exists()).toBe(true);
        expect(banner.text()).toContain('45');
    });
});
