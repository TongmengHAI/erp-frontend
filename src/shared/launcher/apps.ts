// ─────────────────────────────────────────────────────────────────────────────
// Launcher app registry — the source of truth for "what apps exist."
//
// Used by three surfaces:
//   1. LauncherPage (Session 2) — renders one card per accessible app
//   2. AppIdentityBadge — looks up the active app's label/icon from
//      route.matched[0].meta.app
//   3. getDefaultRoute — picks the user's landing app post-login
//      (currently HRM; future: walks the registry by access)
//
// Adding an app = appending an entry here + adding its layout/routes.
// No conditional logic to update across the codebase.
//
// The registry is intentionally a static const, NOT a Pinia store —
// the set of apps is determined at build time, not per-user. Per-user
// VISIBILITY filtering happens at the consumer (LauncherPage filters by
// permissionPrefix; getDefaultRoute walks in order).
// ─────────────────────────────────────────────────────────────────────────────

export interface LauncherApp {
    /** Stable id — matches route.matched[0].meta.app on this app's routes. */
    id: string;
    /** i18n key for the card title + identity-badge label. */
    label: string;
    /** i18n key for the card body copy (launcher only). */
    description: string;
    /** PrimeIcons class. */
    icon: string;
    /** Named route the launcher card click + getDefaultRoute() navigate to. */
    defaultRouteName: string;
    /**
     * Permission-prefix gate — same shape as the old SidebarModule. The
     * launcher hides cards the user lacks ANY matching permission for;
     * getDefaultRoute() skips apps the user can't access.
     */
    permissionPrefix: string;
    /**
     * When true, the app is registered in the canonical "what apps
     * exist" sense (AppIdentityBadge picks it up, the URL space + meta
     * are real) BUT it does NOT appear on the launcher grid OR in the
     * AppSwitcherDropdown.
     *
     * Used by `admin` — accessed via the user menu, not via the
     * launcher / app-switcher. Admins navigate to /admin from the
     * top-right avatar dropdown; the launcher's "pick a line of
     * business" affordance + the inter-app jumping affordance both
     * exclude admin because it's a configuration surface, not a
     * line of business.
     *
     * Defaults to false (most apps appear in both surfaces).
     */
    hiddenFromLauncher?: boolean;
}

export const LAUNCHER_APPS: readonly LauncherApp[] = Object.freeze([
    {
        id: 'hrm',
        label: 'launcher.apps.hrm.label',
        description: 'launcher.apps.hrm.description',
        icon: 'pi pi-users',
        defaultRouteName: 'hrm.dashboard',
        permissionPrefix: 'hrm',
    },
    {
        // Admin — accessed via the user menu's "Admin Settings" item
        // (gated on settings.hrm.view). hiddenFromLauncher: true means
        // it doesn't appear in the launcher grid OR the AppSwitcher
        // dropdown — both surfaces filter via !a.hiddenFromLauncher
        // (belt + suspenders so a permissions edge case can't surface
        // admin in the launcher or switcher unintentionally).
        // AppIdentityBadge DOES read this entry (so "ADMIN" surfaces
        // in the top bar inside /admin/*).
        id: 'admin',
        label: 'launcher.apps.admin.label',
        description: 'launcher.apps.admin.description',
        icon: 'pi pi-cog',
        defaultRouteName: 'admin.hrm.settings',
        permissionPrefix: 'settings',
        hiddenFromLauncher: true,
    },
]);

/**
 * Look up an app by its `id` (the value carried in route.matched[0].meta.app).
 * Returns undefined when the id isn't registered — typical for routes outside
 * any app (launcher itself, login, tenant-suspended).
 */
export function findLauncherApp(id: string | undefined): LauncherApp | undefined {
    if (id === undefined) return undefined;
    return LAUNCHER_APPS.find((a) => a.id === id);
}
