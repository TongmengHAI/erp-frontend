import type { RouteLocationRaw } from 'vue-router';

import { LAUNCHER_APPS } from '@/shared/launcher/apps';

// ─────────────────────────────────────────────────────────────────────────────
// getDefaultRoute — single source of truth for "where does the user go
// when they have no specific destination?"
//
// Consumers:
//   • LoginPage success path (post-authentication redirect)
//   • Route guard's guest-gate (logged-in user hits /login → bounce here)
//   • The `/` redirect (root URL with no specific target)
//
// v1: HRM is the only app. A user with any hrm.* permission lands directly
// on the HRM dashboard — skips a launcher round-trip when there's only one
// place to go. Users without hrm.* (rare; tenant member with no app
// access) land on the launcher, which renders zero cards with a
// "talk to your admin" empty state. That's better than 401-ing them
// out of an authenticated session.
//
// Future: when Accounting / Inventory / etc. ship, this function walks
// the registry — first app the user has access to wins. Eventually the
// "preferred default app" user preference (currently in explicit cuts)
// would slot in here without touching any consumer.
//
// Pure function over the permissions array — no Pinia / no router /
// no side effects — so it's unit-testable without a Vue context.
// ─────────────────────────────────────────────────────────────────────────────

export function getDefaultRoute(permissions: readonly string[]): RouteLocationRaw {
    for (const app of LAUNCHER_APPS) {
        const prefix = app.permissionPrefix;
        const hasAccess = permissions.some(
            (p) => p === prefix || p.startsWith(`${prefix}.`),
        );
        if (hasAccess) {
            return { name: app.defaultRouteName };
        }
    }

    // Fall-through: no accessible apps. Land on the launcher; its
    // zero-card empty state explains the situation to the user.
    return { name: 'launcher' };
}
