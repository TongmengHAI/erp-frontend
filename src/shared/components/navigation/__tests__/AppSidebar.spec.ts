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
    // The HRM module now ships five flat sibling entries: Employees,
    // Departments, Leave requests, Attendance, Positions. All five
    // gate on permissionPrefix 'hrm' so any hrm.* permission unlocks
    // them. 10 sidebar entries total is the threshold where the
    // Odoo-style nav refactor becomes overwhelmingly justified —
    // registered for after Leave Balances ships.
    { path: '/hrm/employees', name: 'hrm.employee.list', component: STUB },
    { path: '/hrm/departments', name: 'hrm.department.list', component: STUB },
    { path: '/hrm/leave-requests', name: 'hrm.leaveRequest.list', component: STUB },
    { path: '/hrm/attendance', name: 'hrm.attendance.list', component: STUB },
    { path: '/hrm/positions', name: 'hrm.position.list', component: STUB },
    { path: '/accounting', name: 'accounting', component: STUB },
    { path: '/inventory', name: 'inventory', component: STUB },
    { path: '/procurement', name: 'procurement', component: STUB },
    { path: '/sales', name: 'sales', component: STUB },
];

function seedAllPermissions(): void {
    const auth = useAuthStore();
    auth.$patch({
        user: {
            id: 1,
            name: 'Admin User',
            email: 'admin@acme.example',
            email_verified_at: null,
        },
        // Realistic backend-shape permissions ({domain}.{resource}.{action}).
        // The sidebar gate uses canAny(prefix), so any 'accounting.*'
        // permission unlocks the Accounting module, etc.
        permissions: [
            'hrm.employee.view',
            'accounting.journal_entry.view',
            'inventory.item.view',
            'procurement.purchase_order.view',
            'sales.invoice.view',
        ],
    });
}

function seedSomePermissions(perms: string[]): void {
    const auth = useAuthStore();
    auth.$patch({
        user: {
            id: 2,
            name: 'Limited User',
            email: 'limited@acme.example',
            email_verified_at: null,
        },
        permissions: perms,
    });
}

describe('AppSidebar', () => {
    it('renders all 10 modules when the user has every permission', async () => {
        const w = await mountWithGlobals(AppSidebar, { routes: NAV_ROUTES });
        seedAllPermissions();
        await w.vm.$nextTick();

        const links = w.findAll('a[data-route-name]');
        expect(links).toHaveLength(10);
        const names = links.map((l) => l.attributes('data-route-name'));
        expect(names).toEqual([
            'dashboard',
            'hrm.employee.list',
            'hrm.department.list',
            'hrm.leaveRequest.list',
            'hrm.attendance.list',
            'hrm.position.list',
            'accounting',
            'inventory',
            'procurement',
            'sales',
        ]);
    });

    it('hides modules the user lacks permission for (Dashboard always shows)', async () => {
        const w = await mountWithGlobals(AppSidebar, { routes: NAV_ROUTES });
        // Single accounting permission — only 'accounting' prefix matches.
        seedSomePermissions(['accounting.journal_entry.view']);
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
        expect(aside.classes()).toContain('w-15');
        expect(aside.classes()).not.toContain('w-60');
        expect(aside.attributes('data-collapsed')).toBe('true');
    });

    it('applies the expanded-width class when ui.sidebarCollapsed is false', async () => {
        const w = await mountWithGlobals(AppSidebar, { routes: NAV_ROUTES });
        const ui = useUiStore();
        ui.setSidebarCollapsed(false);
        await w.vm.$nextTick();

        const aside = w.find('aside');
        expect(aside.classes()).toContain('w-60');
        expect(aside.classes()).not.toContain('w-15');
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
        const hrmLink = w.find('a[data-route-name="hrm.employee.list"]');
        expect(hrmLink.classes()).not.toContain('sidebar-item--active');
    });
});
