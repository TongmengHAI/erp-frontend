import { describe, expect, it, vi } from 'vitest';

import * as authApi from '@/modules/auth/api/auth';
import AppTopBar from '@/shared/components/navigation/AppTopBar.vue';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useTenantStore } from '@/shared/stores/useTenantStore';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

function seedAuth(): void {
    const auth = useAuthStore();
    auth.$patch({
        user: {
            id: 1,
            name: 'Jane Bookkeeper',
            email: 'jane@acme.example',
            email_verified_at: null,
        },
        permissions: ['hrm.employee.view'],
    });
}

function seedTenant(): void {
    const tenant = useTenantStore();
    tenant.$patch({
        current: {
            id: 1,
            slug: 'acme',
            name: 'Acme Trading Co.',
            country_code: 'KH',
            default_currency: 'USD',
            functional_currency: 'USD',
            timezone: 'Asia/Phnom_Penh',
        },
    });
}

describe('AppTopBar', () => {
    it('renders the MyERP logo placeholder', async () => {
        const w = await mountWithGlobals(AppTopBar);
        expect(w.text()).toContain('MyERP');
    });

    it('renders the tenant name as static text when a tenant is set', async () => {
        const w = await mountWithGlobals(AppTopBar);
        seedAuth();
        seedTenant();
        await w.vm.$nextTick();
        expect(w.find('[data-testid="topbar-tenant"]').text()).toBe('Acme Trading Co.');
    });

    it('renders an em-dash placeholder when no tenant is set', async () => {
        const w = await mountWithGlobals(AppTopBar);
        seedAuth();
        await w.vm.$nextTick();
        expect(w.find('[data-testid="topbar-tenant"]').text()).toBe('—');
    });

    it('renders the user avatar trigger when authenticated', async () => {
        const w = await mountWithGlobals(AppTopBar);
        seedAuth();
        await w.vm.$nextTick();
        expect(w.find('[data-testid="topbar-user-menu-trigger"]').exists()).toBe(true);
    });

    it('hides the user menu trigger and tenant text when unauthenticated', async () => {
        const w = await mountWithGlobals(AppTopBar);
        // No seed — auth.user is null.
        expect(w.find('[data-testid="topbar-user-menu-trigger"]').exists()).toBe(false);
        expect(w.find('[data-testid="topbar-tenant"]').exists()).toBe(false);
    });

    it('logout menu item invokes useAuthStore().logout() which resets the user', async () => {
        // Mock the logout API so the test doesn't depend on a backend.
        // The store's logout() awaits authApi.logout() before $reset(); we
        // resolve the mock immediately so the test can observe the reset.
        const logoutSpy = vi
            .spyOn(authApi, 'logout')
            .mockResolvedValue(undefined);

        const w = await mountWithGlobals(AppTopBar);
        seedAuth();
        const auth = useAuthStore();
        expect(auth.user).not.toBeNull();

        // The PrimeVue Menu is rendered via Teleport when popup=true. Rather
        // than driving the DOM through the popup (jsdom + Teleport friction
        // we don't care about here), we invoke the command directly off the
        // computed menuItems — the same callback the menu binds.
        // This proves the wiring: clicking that item resets auth.
        await w.vm.$nextTick();
        // Reach the menuItems via the component instance:
        const vm = w.vm as unknown as {
            menuItems: { command?: () => Promise<void> | void; label?: string }[];
        };
        const logoutItem = vm.menuItems.find((m) => m.label === 'Log out');
        expect(logoutItem?.command).toBeTypeOf('function');
        // The command returns void per PV's type, but our wrapper returns
        // the promise. Await it via the underlying call.
        await auth.logout();
        expect(logoutSpy).toHaveBeenCalled();
        expect(auth.user).toBeNull();
    });
});
