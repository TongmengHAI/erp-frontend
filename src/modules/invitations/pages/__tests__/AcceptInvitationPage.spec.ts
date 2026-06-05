import ToastService from 'primevue/toastservice';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import type { RouteRecordRaw } from 'vue-router';

import AcceptInvitationPage from '@/modules/invitations/pages/AcceptInvitationPage.vue';
import * as invitationsApi from '@/modules/invitations/api/invitations';
import * as authApi from '@/modules/auth/api/auth';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// AcceptInvitationPage — Phase 2A Session 5.
//
// 5-state matrix at the page level:
//   1. loading       — preview fetch in-flight
//   2. invalid       — preview returned 422 with error_code → render the
//                      InvitationInvalidPage variant inside the page
//   3. error         — non-422 network failure
//   4. populated     — preview + form rendered
//   5. (no permission-denied — public route)
//
// Plus the LOAD-BEARING auto-login flow:
//   • Submit → backend returns 201 → backend has already issued a
//     Sanctum session cookie (set inside the POST handler)
//   • Page calls auth.fetchMe() → store populates
//   • Page navigates via getDefaultRoute()
// ─────────────────────────────────────────────────────────────────────────────

function freshVueQueryPlugin() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return [VueQueryPlugin, { queryClient: client }] as const;
}

const VALID_TOKEN = 'A'.repeat(43); // matches the {43} route regex

const ROUTES: RouteRecordRaw[] = [
    { path: '/', name: 'home', component: { template: '<div />' } },
    { path: '/apps', name: 'launcher', component: { template: '<div />' } },
    { path: '/login', name: 'login', component: { template: '<div />' } },
    {
        path: '/hrm',
        name: 'hrm.dashboard',
        component: { template: '<div />' },
    },
    {
        path: '/invitation/:token',
        name: 'invitations.accept',
        component: AcceptInvitationPage,
    },
];

const PREVIEW_RESPONSE = {
    data: {
        email: 'invitee@example.com',
        name: 'Test Invitee',
        tenant: { name: 'Acme Trading Co.', slug: 'acme' },
        role_name: 'tenant_admin',
        invited_by_name: 'Admin User',
        expires_at: '2026-06-15T00:00:00+00:00',
    },
};

function mountAcceptPage() {
    return mountWithGlobals(AcceptInvitationPage, {
        extraPlugins: [ToastService, freshVueQueryPlugin()],
        routes: ROUTES,
        initialRoute: `/invitation/${VALID_TOKEN}`,
    });
}

function axios422WithErrorCode(code: string) {
    const error = new Error('Unprocessable') as Error & {
        isAxiosError?: boolean;
        response?: { status: number; data: unknown };
    };
    error.isAxiosError = true;
    error.response = {
        status: 422,
        data: { error_code: code, message: 'Invalid invitation.' },
    };
    return error;
}

describe('AcceptInvitationPage — page-level state matrix', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('STATE 1 (loading): renders LoadingState while preview is in-flight', async () => {
        vi.spyOn(invitationsApi, 'showInvitation').mockImplementation(
            () => new Promise(() => undefined),
        );

        const w = await mountAcceptPage();
        await w.vm.$nextTick();

        expect(w.find('[data-testid="accept-invitation-loading"]').exists()).toBe(true);
        expect(w.find('[data-testid="accept-invitation-preview"]').exists()).toBe(false);
    });

    it.each([
        ['token_invalid'],
        ['expired'],
        ['cancelled'],
        ['accepted'],
    ] as const)(
        "STATE 2 (invalid): preview 422 with error_code='%s' renders the matching InvitationInvalidPage variant",
        async (code) => {
            vi.spyOn(invitationsApi, 'showInvitation').mockRejectedValue(
                axios422WithErrorCode(code),
            );

            const w = await mountAcceptPage();

            await new Promise((resolve) => setTimeout(resolve, 200));
            await w.vm.$nextTick();
            await new Promise((resolve) => setTimeout(resolve, 50));
            await w.vm.$nextTick();

            expect(w.find(`[data-testid="invitation-invalid-${code}"]`).exists()).toBe(true);
            // Form is NOT rendered when invalid.
            expect(w.find('[data-testid="accept-invitation-preview"]').exists()).toBe(false);
        },
    );

    it('STATE 3 (error): non-422 network failure renders ErrorState with retry', async () => {
        const networkErr = new Error('Network down') as Error & {
            isAxiosError?: boolean;
            response?: undefined;
        };
        networkErr.isAxiosError = true;
        networkErr.response = undefined;
        vi.spyOn(invitationsApi, 'showInvitation').mockRejectedValue(networkErr);

        const w = await mountAcceptPage();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="accept-invitation-error"]').exists()).toBe(true);
    });

    it('STATE 4 (populated): preview success renders the context dl + the form', async () => {
        vi.spyOn(invitationsApi, 'showInvitation').mockResolvedValue(PREVIEW_RESPONSE);

        const w = await mountAcceptPage();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        // Preview rendered with the invitee context.
        expect(w.find('[data-testid="accept-invitation-preview"]').exists()).toBe(true);
        expect(w.find('[data-testid="accept-invitation-preview-email"]').text()).toContain(
            'invitee@example.com',
        );
        expect(w.find('[data-testid="accept-invitation-preview-tenant"]').text()).toContain(
            'Acme Trading Co.',
        );
        expect(w.find('[data-testid="accept-invitation-preview-role"]').text()).toContain(
            'tenant_admin',
        );
        expect(w.find('[data-testid="accept-invitation-preview-inviter"]').text()).toContain(
            'Admin User',
        );

        // Form rendered.
        expect(w.find('[data-testid="accept-invitation-name"]').exists()).toBe(true);
        expect(w.find('[data-testid="accept-invitation-submit"]').exists()).toBe(true);
    });
});

describe('AcceptInvitationPage — LOAD-BEARING auto-login flow', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('LOAD-BEARING: on successful accept, the page calls auth.fetchMe() (which picks up the backend-issued session cookie)', async () => {
        // The contract being pinned: after acceptInvitation resolves,
        // the page MUST call /auth/me. The backend issued the session
        // cookie inside the POST handler; without /me the SPA's
        // authStore stays empty and the subsequent getDefaultRoute()
        // would land on the launcher with no user data.
        //
        // The structural assertion is: authApi.me() is called within
        // the success path. The downstream navigation depends on the
        // getDefaultRoute() result which depends on /me's payload;
        // we don't assert the exact final URL because the router
        // setup is stubbed.
        vi.spyOn(invitationsApi, 'showInvitation').mockResolvedValue(PREVIEW_RESPONSE);
        vi.spyOn(invitationsApi, 'acceptInvitation').mockResolvedValue({
            data: {
                user: {
                    id: 10,
                    name: 'Test Invitee',
                    email: 'invitee@example.com',
                    email_verified_at: '2026-06-08T00:00:00+00:00',
                    type: 'tenant_user',
                    is_super_admin: false,
                },
                tenant: { id: 1, slug: 'acme', name: 'Acme Trading Co.' },
            },
        });

        const meSpy = vi.spyOn(authApi, 'me').mockResolvedValue({
            data: {
                user: {
                    id: 10,
                    name: 'Test Invitee',
                    email: 'invitee@example.com',
                    email_verified_at: '2026-06-08T00:00:00+00:00',
                    type: 'tenant_user',
                    is_super_admin: false,
                },
                tenant: { id: 1, slug: 'acme', name: 'Acme Trading Co.', country_code: 'KH', default_currency: 'USD', functional_currency: 'USD', timezone: 'Asia/Phnom_Penh' },
                current_company: null,
                companies: [],
                roles: ['tenant_admin'],
                permissions: ['users.view', 'users.invite'],
                entitled_modules: [],
            } as unknown as Awaited<ReturnType<typeof authApi.me>>['data'] extends infer R ? R : never,
        } as unknown as Awaited<ReturnType<typeof authApi.me>>);

        const w = await mountAcceptPage();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        // The form rendered.
        expect(w.find('[data-testid="accept-invitation-preview"]').exists()).toBe(true);

        // Submit the form via the form element (Pest-friendly, bypasses
        // PV Button click brittleness).
        const form = w.find('form');
        // VeeValidate requires the form values to satisfy the Zod
        // schema. Easiest path: directly call the page's submit
        // handler via the wrapper's emitted submit event; since the
        // schema requires a strong password, set passwordValue via
        // useField in the test. Instead, we set the input value:
        // PrimeVue Password wraps its inner <input>; setting value on
        // the [data-testid] doesn't propagate to the v-model. Reach
        // the actual <input type="password"> via the DOM and dispatch
        // input + change events so the underlying v-model fires.
        const innerInput = w.find('input[type="password"]').element as HTMLInputElement;
        innerInput.value = 'P@ssw0rd-VeryStrong-789!';
        innerInput.dispatchEvent(new Event('input', { bubbles: true }));
        innerInput.dispatchEvent(new Event('change', { bubbles: true }));
        await w.vm.$nextTick();

        await form.trigger('submit.prevent');

        // Wait for the mutation + fetchMe chain.
        await new Promise((resolve) => setTimeout(resolve, 100));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        // The LOAD-BEARING assertion: /me was called.
        expect(meSpy).toHaveBeenCalled();
    });

    it('LOAD-BEARING: 422 race during submit (token went invalid) switches the page to invalid state', async () => {
        // Race window: preview succeeded, the user filled in the form,
        // but between preview and accept the token went invalid (admin
        // cancelled, another tab accepted, expiry crossed). The
        // accept POST returns 422 with error_code; the page must
        // switch to the invalid variant rather than surface a form-
        // level banner.
        vi.spyOn(invitationsApi, 'showInvitation').mockResolvedValue(PREVIEW_RESPONSE);
        vi.spyOn(invitationsApi, 'acceptInvitation').mockRejectedValue(
            axios422WithErrorCode('cancelled'),
        );

        const w = await mountAcceptPage();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        expect(w.find('[data-testid="accept-invitation-preview"]').exists()).toBe(true);

        const innerInput = w.find('input[type="password"]').element as HTMLInputElement;
        innerInput.value = 'P@ssw0rd-VeryStrong-789!';
        innerInput.dispatchEvent(new Event('input', { bubbles: true }));
        innerInput.dispatchEvent(new Event('change', { bubbles: true }));
        await w.vm.$nextTick();

        await w.find('form').trigger('submit.prevent');
        await new Promise((resolve) => setTimeout(resolve, 100));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        // Page switched to the invalid 'cancelled' variant.
        expect(w.find('[data-testid="invitation-invalid-cancelled"]').exists()).toBe(true);
        // Form gone.
        expect(w.find('[data-testid="accept-invitation-preview"]').exists()).toBe(false);
    });
});
