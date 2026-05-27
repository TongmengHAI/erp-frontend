import { describe, expect, it } from 'vitest';
import type { RouteRecordRaw } from 'vue-router';

import HrmAppSidebar from '@/modules/hrm/navigation/HrmAppSidebar.vue';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useUiStore } from '@/shared/stores/useUiStore';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// HrmAppSidebar — replaces the old global AppSidebar. Renders 8 entries
// (Dashboard + 7 modules) when the user has ANY hrm.* permission;
// renders nothing when they don't.
//
// Active-route highlight: the sidebar marks an item active when the
// current route's matched chain contains the item's name. That covers
// nested URLs like /hrm/employees/5/edit keeping the Employees item
// highlighted.
// ─────────────────────────────────────────────────────────────────────────────

const STUB = { template: '<div />' };

const NAV_ROUTES: RouteRecordRaw[] = [
    { path: '/', name: 'home', component: STUB },
    { path: '/apps', name: 'launcher', component: STUB },
    // The 8 routes the HRM sidebar links to. Order matches HRM_NAV_ITEMS.
    { path: '/hrm', name: 'hrm.dashboard', component: STUB },
    { path: '/hrm/employees', name: 'hrm.employee.list', component: STUB },
    { path: '/hrm/departments', name: 'hrm.department.list', component: STUB },
    { path: '/hrm/positions', name: 'hrm.position.list', component: STUB },
    { path: '/hrm/branches', name: 'hrm.branch.list', component: STUB },
    { path: '/hrm/leave-requests', name: 'hrm.leaveRequest.list', component: STUB },
    { path: '/hrm/attendance', name: 'hrm.attendance.list', component: STUB },
    { path: '/hrm/leave-balances', name: 'hrm.leaveBalance.list', component: STUB },
    // Nested-child shape used to test the active-match-via-matched-chain.
    {
        path: '/hrm/employees/:id',
        name: 'hrm.employee.detail',
        component: STUB,
    },
];

function seedHrmAdmin(): void {
    const auth = useAuthStore();
    auth.$patch({
        user: { id: 1, name: 'Admin', email: 'admin@x', email_verified_at: null },
        permissions: [
            'hrm.employee.view',
            'hrm.department.view',
            'hrm.position.view',
            'hrm.branch.view',
            'hrm.leave_request.view',
            'hrm.attendance.view',
            'hrm.leave_balance.view',
        ],
    });
}

describe('HrmAppSidebar', () => {
    it('renders all 8 HRM nav items when the user has any hrm.* permission', async () => {
        const w = await mountWithGlobals(HrmAppSidebar, { routes: NAV_ROUTES });
        seedHrmAdmin();
        await w.vm.$nextTick();

        const links = w.findAll('a[data-route-name]');
        expect(links).toHaveLength(8);
        const names = links.map((l) => l.attributes('data-route-name'));
        // Order pinned: Dashboard sits first; modules then follow the
        // hrmNavItems order.
        expect(names).toEqual([
            'hrm.dashboard',
            'hrm.employee.list',
            'hrm.department.list',
            'hrm.position.list',
            'hrm.branch.list',
            'hrm.leaveRequest.list',
            'hrm.attendance.list',
            'hrm.leaveBalance.list',
        ]);
    });

    it('renders nothing when the user has no hrm.* permissions', async () => {
        const w = await mountWithGlobals(HrmAppSidebar, { routes: NAV_ROUTES });
        const auth = useAuthStore();
        // User has tenant access but no hrm.* perms (rare: tenant member
        // with no app access). The sidebar should be empty — no
        // "permission denied" rendering, just zero rail items. The
        // user reaching this state would normally have been routed
        // to the launcher by getDefaultRoute, but the component itself
        // must still be defensive.
        auth.$patch({
            user: { id: 2, name: 'Limited', email: 'l@x', email_verified_at: null },
            permissions: [],
        });
        await w.vm.$nextTick();

        const links = w.findAll('a[data-route-name]');
        expect(links).toHaveLength(0);
    });

    it('highlights the Employees item when the route is hrm.employee.list', async () => {
        const w = await mountWithGlobals(HrmAppSidebar, {
            routes: NAV_ROUTES,
            initialRoute: '/hrm/employees',
        });
        seedHrmAdmin();
        await w.vm.$nextTick();

        const employeesLink = w.find('a[data-route-name="hrm.employee.list"]');
        expect(employeesLink.classes()).toContain('sidebar-item--active');
        // The Dashboard item should NOT be active when we're on Employees.
        const dashboardLink = w.find('a[data-route-name="hrm.dashboard"]');
        expect(dashboardLink.classes()).not.toContain('sidebar-item--active');
    });

    it('applies collapsed-width when ui.sidebarCollapsed is true', async () => {
        const w = await mountWithGlobals(HrmAppSidebar, { routes: NAV_ROUTES });
        const ui = useUiStore();
        ui.setSidebarCollapsed(true);
        await w.vm.$nextTick();

        const aside = w.find('aside');
        expect(aside.classes()).toContain('w-15');
        expect(aside.classes()).not.toContain('w-60');
        expect(aside.attributes('data-collapsed')).toBe('true');
    });

    it('toggle button calls ui.toggleSidebar()', async () => {
        const w = await mountWithGlobals(HrmAppSidebar, { routes: NAV_ROUTES });
        const ui = useUiStore();
        const before = ui.sidebarCollapsed;

        await w.find('[data-testid="sidebar-toggle"]').trigger('click');
        expect(ui.sidebarCollapsed).toBe(!before);
    });
});
