import type { SidebarModule } from '@/shared/types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// Hardcoded sidebar module list (master decision 13).
//
// Each entry's `label` is an i18n key resolved by AppSidebar at render time.
// `permission` follows the Spatie convention `{domain}.access` — the gating
// permission for whether the module appears in navigation at all. Dashboard
// has no permission set (visible to every authenticated user).
//
// When a domain ships sub-pages, they get their own routes within the domain
// and do not appear here; only top-level navigation lives in this list.
// ─────────────────────────────────────────────────────────────────────────────

export const SIDEBAR_MODULES: readonly SidebarModule[] = Object.freeze([
    {
        label: 'navigation.modules.dashboard',
        icon: 'pi pi-home',
        routeName: 'dashboard',
    },
    {
        label: 'navigation.modules.hrm',
        icon: 'pi pi-users',
        routeName: 'hrm',
        permission: 'hrm.access',
    },
    {
        label: 'navigation.modules.accounting',
        icon: 'pi pi-book',
        routeName: 'accounting',
        permission: 'accounting.access',
    },
    {
        label: 'navigation.modules.inventory',
        icon: 'pi pi-box',
        routeName: 'inventory',
        permission: 'inventory.access',
    },
    {
        label: 'navigation.modules.procurement',
        icon: 'pi pi-shopping-cart',
        routeName: 'procurement',
        permission: 'procurement.access',
    },
    {
        label: 'navigation.modules.sales',
        icon: 'pi pi-chart-line',
        routeName: 'sales',
        permission: 'sales.access',
    },
]);
