import { describe, expect, it } from 'vitest';
import type { RouteRecordRaw } from 'vue-router';

import AppSidebar from '@/shared/components/navigation/AppSidebar.vue';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useUiStore } from '@/shared/stores/useUiStore';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

const STUB = { template: '<div />' };

// Routes covering every named target the hardcoded module list points at.
// Without these, <RouterLink :to="{ name: 'accounting' }" /> warns and the
// test output gets noisy.
const NAV_ROUTES: RouteRecordRaw[] = [
    { path: '/', name: 'home', component: STUB },
    { path: '/dashboard', name: 'dashboard', component: STUB },
    { path: '/hrm', name: 'hrm', component: STUB },
    { path: '/accounting', name: 'accounting', component: STUB },
    { path: '/inventory', name: 'inventory', component: STUB },
    { path: '/procurement', name: 'procurement', component: STUB },
    { path: '/sales', name: 'sales', component: STUB },
];

function seedAllPermissions(): void {
    const auth = useAuthStore();
    auth.$patch({
        user: {
            id: 'u_1',
            name: 'Admin User',
            email: 'admin@acme.example',
            permissions: [
                'hrm.access',
                'accounting.access',
                'inventory.access',
                'procurement.access',
                'sales.access',
            ],
        },
    });
}

function seedSomePermissions(perms: string[]): void {
    const auth = useAuthStore();
    auth.$patch({
        user: {
            id: 'u_2',
            name: 'Limited User',
            email: 'limited@acme.example',
            permissions: perms,
        },
    });
}

describe('AppSidebar', () => {
    it('renders all 6 modules when the user has every permission', async () => {
        const w = await mountWithGlobals(AppSidebar, { routes: NAV_ROUTES });
        seedAllPermissions();
        await w.vm.$nextTick();

        const links = w.findAll('a[data-route-name]');
        expect(links).toHaveLength(6);
        const names = links.map((l) => l.attributes('data-route-name'));
        expect(names).toEqual([
            'dashboard',
            'hrm',
            'accounting',
            'inventory',
            'procurement',
            'sales',
        ]);
    });

    it('hides modules the user lacks permission for (Dashboard always shows)', async () => {
        const w = await mountWithGlobals(AppSidebar, { routes: NAV_ROUTES });
        seedSomePermissions(['accounting.access']);
        await w.vm.$nextTick();

        const names = w
            .findAll('a[data-route-name]')
            .map((l) => l.attributes('data-route-name'));
        // Dashboard (no permission gate) + Accounting only.
        expect(names).toEqual(['dashboard', 'accounting']);
    });

    it('renders zero gated modules when the user has no domain permissions, but Dashboard remains', async () => {
        const w = await mountWithGlobals(AppSidebar, { routes: NAV_ROUTES });
        seedSomePermissions([]);
        await w.vm.$nextTick();

        const names = w
            .findAll('a[data-route-name]')
            .map((l) => l.attributes('data-route-name'));
        expect(names).toEqual(['dashboard']);
    });

    it('applies the collapsed-width class when ui.sidebarCollapsed is true', async () => {
        const w = await mountWithGlobals(AppSidebar, { routes: NAV_ROUTES });
        const ui = useUiStore();
        ui.setSidebarCollapsed(true);
        await w.vm.$nextTick();

        const aside = w.find('aside');
        expect(aside.classes()).toContain('w-[60px]');
        expect(aside.classes()).not.toContain('w-[240px]');
        expect(aside.attributes('data-collapsed')).toBe('true');
    });

    it('applies the expanded-width class when ui.sidebarCollapsed is false', async () => {
        const w = await mountWithGlobals(AppSidebar, { routes: NAV_ROUTES });
        const ui = useUiStore();
        ui.setSidebarCollapsed(false);
        await w.vm.$nextTick();

        const aside = w.find('aside');
        expect(aside.classes()).toContain('w-[240px]');
        expect(aside.classes()).not.toContain('w-[60px]');
    });

    it('toggle button calls ui.toggleSidebar()', async () => {
        const w = await mountWithGlobals(AppSidebar, { routes: NAV_ROUTES });
        const ui = useUiStore();
        const before = ui.sidebarCollapsed;

        await w.find('[data-testid="sidebar-toggle"]').trigger('click');
        expect(ui.sidebarCollapsed).toBe(!before);
    });

    it('active route gets the highlight class', async () => {
        const w = await mountWithGlobals(AppSidebar, {
            routes: NAV_ROUTES,
            initialRoute: '/accounting',
        });
        seedAllPermissions();
        await w.vm.$nextTick();

        const accountingLink = w.find('a[data-route-name="accounting"]');
        expect(accountingLink.classes()).toContain('sidebar-item--active');
        // Non-active link should not have the highlight.
        const hrmLink = w.find('a[data-route-name="hrm"]');
        expect(hrmLink.classes()).not.toContain('sidebar-item--active');
    });
});
