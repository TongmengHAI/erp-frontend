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
        // HRM ships its first real page in E1 (employee list). The sidebar
        // routes directly to the list rather than through the /hrm redirect
        // — that's cosmetic (the route is the active one either way), but
        // it makes the active-item highlight precise.
        label: 'navigation.modules.hrm',
        icon: 'pi pi-users',
        routeName: 'hrm.employee.list',
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
