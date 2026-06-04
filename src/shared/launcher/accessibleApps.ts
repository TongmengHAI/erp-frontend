import { LAUNCHER_APPS, type LauncherApp } from '@/shared/launcher/apps';

// ─────────────────────────────────────────────────────────────────────────────
// accessibleApps — single source of truth for "which apps does this user
// see in launcher / switcher surfaces?"
//
// Two consumers (the belt-and-suspenders pattern per §10.6):
//   1. LauncherPage (/apps grid)
//   2. AppSwitcherDropdown (top-bar inter-app jump menu)
//
// Both consumers route through this function so they cannot drift —
// adding a new filter dimension here (e.g. future "preferred app
// pinning" per user-preference) propagates to both surfaces.
//
// Filter dimensions (orthogonal):
//   A. surfaceVisibility: hiddenFromLauncher — apps reached via the
//      user menu (Admin) are hidden from launcher + switcher entirely.
//   B. userType:          superAdminOnly — apps visible ONLY to SA
//      users (Super Admin Portal) vs tenant users (HRM, Admin).
//   C. entitlement:       entitlementGated — when true (the default),
//      the app id must appear in entitled_modules. When false (Admin,
//      Super Admin Portal), entitlement isn't checked.
//   D. permission:        permissionPrefix — the user must have at
//      least one permission matching the prefix (auth.canAny()
//      semantics). For SA-only apps, this dimension is skipped (SA
//      gates by user-type, not permissions; SA has no Spatie
//      permissions by design).
//
// The function is a pure projection over LAUNCHER_APPS + the small
// user-shape input — no Pinia, no router, no Vue context — so it's
// unit-testable without a Vue setup.
// ─────────────────────────────────────────────────────────────────────────────

export interface AccessibleAppsUser {
    isSuperAdmin: boolean;
    entitledModules: readonly string[];
    permissions: readonly string[];
}

export function accessibleApps(user: AccessibleAppsUser): LauncherApp[] {
    return LAUNCHER_APPS.filter((app) => {
        // A. surfaceVisibility — hidden from both launcher AND switcher.
        if (app.hiddenFromLauncher) return false;

        // B. userType — orthogonal to entitlement, applied first.
        if (user.isSuperAdmin) {
            // SA's launcher view: only superAdminOnly apps. Everything
            // else (tenant-side apps like HRM) is hidden — the SA has
            // no tenant context to reach a tenant module.
            return app.superAdminOnly === true;
        }

        // Non-SA: SA-only apps are hidden.
        if (app.superAdminOnly === true) return false;

        // C. entitlement — only checked for entitlement-gated apps.
        if (app.entitlementGated !== false && !user.entitledModules.includes(app.id)) {
            return false;
        }

        // D. permission — at least one user permission matches the
        //    app's prefix (canAny semantics).
        return user.permissions.some(
            (p) => p === app.permissionPrefix || p.startsWith(`${app.permissionPrefix}.`),
        );
    });
}
