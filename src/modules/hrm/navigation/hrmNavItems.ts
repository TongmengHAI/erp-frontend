import type { SidebarModule } from '@/shared/types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// HRM-scoped sidebar items — rendered ONLY when the user is inside the
// HRM app (i.e. on a /hrm/* route). Replaces the old global modules.ts
// SIDEBAR_MODULES list.
//
// Order matters: Dashboard sits first as the app's landing surface;
// then the 7 module entries roughly grouped by frequency-of-use
// (Employees the most central, then organisation structure, then the
// workflow / time / allocation modules).
//
// Permission-gating uses `auth.canAny(prefix)` — same shape as the
// old modules.ts. A user with ANY hrm.* permission sees the Dashboard
// + the modules they have specific permissions for.
//
// HRM Dashboard route name is 'hrm.dashboard' — that route lands in
// Session 2; this list registers the navigation entry now so the
// sidebar renders consistently the moment the dashboard page exists.
// ─────────────────────────────────────────────────────────────────────────────

export const HRM_NAV_ITEMS: readonly SidebarModule[] = Object.freeze([
    {
        label: 'hrm.navigation.dashboard',
        icon: 'pi pi-th-large',
        routeName: 'hrm.dashboard',
        permissionPrefix: 'hrm',
    },
    {
        label: 'hrm.navigation.employees',
        icon: 'pi pi-users',
        routeName: 'hrm.employee.list',
        permissionPrefix: 'hrm',
    },
    {
        label: 'hrm.navigation.departments',
        icon: 'pi pi-sitemap',
        routeName: 'hrm.department.list',
        permissionPrefix: 'hrm',
    },
    {
        label: 'hrm.navigation.positions',
        icon: 'pi pi-briefcase',
        routeName: 'hrm.position.list',
        permissionPrefix: 'hrm',
    },
    {
        label: 'hrm.navigation.branches',
        icon: 'pi pi-building',
        routeName: 'hrm.branch.list',
        permissionPrefix: 'hrm',
    },
    {
        label: 'hrm.navigation.leaveRequests',
        icon: 'pi pi-calendar',
        routeName: 'hrm.leaveRequest.list',
        permissionPrefix: 'hrm',
    },
    {
        label: 'hrm.navigation.attendance',
        icon: 'pi pi-clock',
        routeName: 'hrm.attendance.list',
        permissionPrefix: 'hrm',
    },
    {
        label: 'hrm.navigation.leaveBalances',
        icon: 'pi pi-wallet',
        routeName: 'hrm.leaveBalance.list',
        permissionPrefix: 'hrm',
    },
]);
