import type { SidebarModule } from '@/shared/types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// Hardcoded sidebar module list (master decision 13).
//
// Module-visibility uses `permissionPrefix` rather than an exact-match
// `permission`. Rationale: "can see Accounting in nav" ≠ "can perform any
// specific accounting action". The prefix gate means a user with ANY
// `accounting.*` permission sees the Accounting nav item, without inventing
// a synthetic `accounting.access` permission on the backend.
//
// Dashboard has no permission gate — visible to every authenticated user.
// ─────────────────────────────────────────────────────────────────────────────

export const SIDEBAR_MODULES: readonly SidebarModule[] = Object.freeze([
    {
        label: 'navigation.modules.dashboard',
        icon: 'pi pi-home',
        routeName: 'dashboard',
    },
    {
        // The HRM module ships two flat sibling entries: Employees and
        // Departments. The original "HRM" label was a placeholder from when
        // Employees was the only HRM module; with two siblings, the more
        // honest IA is to flatten and let the user pick the resource
        // directly. The route name and permission gate are unchanged —
        // only the displayed label moved from navigation.modules.hrm to
        // navigation.modules.employees.
        label: 'navigation.modules.employees',
        icon: 'pi pi-users',
        routeName: 'hrm.employee.list',
        permissionPrefix: 'hrm',
    },
    {
        label: 'navigation.modules.departments',
        icon: 'pi pi-sitemap',
        routeName: 'hrm.department.list',
        permissionPrefix: 'hrm',
    },
    {
        // Leave Requests — third HRM sibling (after Employees and
        // Departments). Same flat-IA decision as the original HRM
        // flattening: rather than a single "HRM" entry that expands,
        // the user picks the resource directly. Keeps the workflow
        // surface one click away from the sidebar.
        label: 'navigation.modules.leaveRequests',
        icon: 'pi pi-calendar',
        routeName: 'hrm.leaveRequest.list',
        permissionPrefix: 'hrm',
    },
    {
        // Attendance — fourth HRM sibling. The clock icon
        // (pi-calendar-clock) sits visually adjacent to the
        // calendar icon used by Leave Requests, reinforcing that
        // both are date-cadence resources viewed from a manager's
        // perspective. permissionPrefix='hrm' (any hrm.*) unlocks.
        label: 'navigation.modules.attendance',
        icon: 'pi pi-clock',
        routeName: 'hrm.attendance.list',
        permissionPrefix: 'hrm',
    },
    {
        label: 'navigation.modules.accounting',
        icon: 'pi pi-book',
        routeName: 'accounting',
        permissionPrefix: 'accounting',
    },
    {
        label: 'navigation.modules.inventory',
        icon: 'pi pi-box',
        routeName: 'inventory',
        permissionPrefix: 'inventory',
    },
    {
        label: 'navigation.modules.procurement',
        icon: 'pi pi-shopping-cart',
        routeName: 'procurement',
        permissionPrefix: 'procurement',
    },
    {
        label: 'navigation.modules.sales',
        icon: 'pi pi-chart-line',
        routeName: 'sales',
        permissionPrefix: 'sales',
    },
]);
