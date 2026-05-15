import { describe, expect, it } from 'vitest';

import AppTopBar from '@/shared/components/navigation/AppTopBar.vue';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useTenantStore } from '@/shared/stores/useTenantStore';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

function seedAuth(): void {
    const auth = useAuthStore();
    auth.$patch({
        user: {
            id: 'u_1',
            name: 'Jane Bookkeeper',
            email: 'jane@acme.example',
            permissions: ['hrm.access'],
        },
    });
}

function seedTenant(): void {
    const tenant = useTenantStore();
    tenant.$patch({ current: { id: 't_1', name: 'Acme Trading Co.' } });
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
            menuItems: { command?: () => void; label?: string }[];
        };
        const logoutItem = vm.menuItems.find((m) => m.label === 'Log out');
        expect(logoutItem?.command).toBeTypeOf('function');
        logoutItem!.command!();
        expect(auth.user).toBeNull();
    });
});
