import type { SidebarModule } from '@/shared/types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// Admin-scoped sidebar items — rendered ONLY when the user is inside
// the admin app (any /admin/* route). Mirror of HRM_NAV_ITEMS shape.
//
// One entry in v1 (HRM Settings). Stage 2-5 features (Users, Roles,
// Module Entitlement, Branch Admin scoping per docs/admin.md) append
// here as they ship — same template, same permission-prefix gate.
//
// Permission-gating uses `auth.canAny('settings')` — same shape as
// the HRM nav. A user with any settings.* permission sees the entries
// in this sidebar; per-item gating drilling down to settings.hrm.view
// vs settings.accounting.view is implicit (the route's own meta gate
// handles the 403 on direct navigation).
// ─────────────────────────────────────────────────────────────────────────────

export const ADMIN_NAV_ITEMS: readonly SidebarModule[] = Object.freeze([
    {
        label: 'admin.navigation.hrmSettings',
        icon: 'pi pi-cog',
        routeName: 'admin.hrm.settings',
        permissionPrefix: 'settings',
    },
    {
        // Phase 2A — User management. Permission prefix is `users`
        // (any users.* perm unlocks the rail entry; the full surface
        // requires users.view per the route-level meta gate, but
        // viewer + admin who have users.view will see it). Phase 2B
        // will eventually add a Roles entry between this and the
        // future module-entitlement entry.
        label: 'admin.navigation.users',
        icon: 'pi pi-users',
        routeName: 'admin.users.list',
        permissionPrefix: 'users',
    },
]);
