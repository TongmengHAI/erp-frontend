import type { RouteLocationRaw } from 'vue-router';

import { accessibleApps } from '@/shared/launcher/accessibleApps';

// ─────────────────────────────────────────────────────────────────────────────
// getDefaultRoute — single source of truth for "where does the user go
// when they have no specific destination?"
//
// Consumers:
//   • LoginPage success path (post-authentication redirect)
//   • Route guard's guest-gate (logged-in user hits /login → bounce here)
//   • The `/` redirect (root URL with no specific target)
//
// Decision matrix (Session 5 of the SA Portal slice — extended from
// the original "first hrm.* permission wins" v1):
//
//   1. SA user                                  → super-admin.dashboard
//      Skips launcher round-trip — SA always knows their destination.
//
//   2. Tenant user with exactly ONE entitled       → that app's dashboard
//      module (and permission for it)
//      Single-app users skip the launcher; one less click on every
//      session start.
//
//   3. Tenant user with MULTIPLE entitled modules  → launcher
//      Multi-module users pick their landing app each session.
//
//   4. Tenant user with ZERO entitled modules    → launcher
//      Zero-card empty state on the launcher explains the situation
//      ("contact your admin"). Better than 401-ing them out of an
//      authenticated session.
//
// Pure function — no Pinia / no router / no side effects — so it's
// unit-testable without a Vue context.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Input shape — what the function needs to make its decision. Matches
 * the shape useAuthStore exposes (isSuperAdmin getter + entitledModules
 * state + permissions array). Keeping it a plain object so the function
 * stays Pinia-free and unit-testable.
 */
export interface DefaultRouteUser {
    isSuperAdmin: boolean;
    entitledModules: readonly string[];
    permissions: readonly string[];
}

export function getDefaultRoute(user: DefaultRouteUser): RouteLocationRaw {
    // 1. SA — fast path. SA has no entitledModules + no permissions;
    //    the user-type flag IS the gate.
    if (user.isSuperAdmin) {
        return { name: 'super-admin.dashboard' };
    }

    // 2. Tenant user — route through the shared accessibleApps()
    //    helper for filter parity with LauncherPage + AppSwitcherDropdown.
    //    Admin and Super Admin are excluded automatically (admin via
    //    hiddenFromLauncher, super-admin via superAdminOnly). The
    //    remaining apps are the ones the user can REACH as a landing
    //    destination.
    //
    //    Exactly-one case: skip the launcher and land on that app.
    //    Two-or-more or zero: land on the launcher and let the user
    //    pick (or see the empty state).
    const apps = accessibleApps(user);

    if (apps.length === 1) {
        return { name: apps[0].defaultRouteName };
    }

    return { name: 'launcher' };
}
