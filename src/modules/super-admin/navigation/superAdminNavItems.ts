import type { SidebarModule } from '@/shared/types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// Super Admin sidebar entries — rendered ONLY inside the SA app
// (any /super-admin/* route). Mirror of HRM_NAV_ITEMS + ADMIN_NAV_ITEMS
// in shape; per §10.6 each app's sidebar is its own registry, not a
// conditional rendering on a shared shell.
//
// Two entries in v1: Dashboard (the SA's landing surface) and Tenants
// (the CRUD list). The session-by-session sidebar growth pattern matches
// the HRM nav's evolution — single entry at first, more as the slice
// ships features.
//
// permissionPrefix: 'super-admin' is currently unused for gating (SA
// users have no Spatie permissions; the SA gate is the user-type flag
// auth.isSuperAdmin, enforced at the layout level by the route guard).
// Reserved for Stage 2 granular SA permissions.
// ─────────────────────────────────────────────────────────────────────────────

export const SUPER_ADMIN_NAV_ITEMS: readonly SidebarModule[] = Object.freeze([
    {
        label: 'superAdmin.navigation.dashboard',
        icon: 'pi pi-th-large',
        routeName: 'super-admin.dashboard',
        permissionPrefix: 'super-admin',
    },
    {
        label: 'superAdmin.navigation.tenants',
        icon: 'pi pi-building',
        routeName: 'super-admin.tenants.list',
        permissionPrefix: 'super-admin',
    },
]);
