import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import { adminRoutes } from '@/modules/admin/routes';
import { authRoutes } from '@/modules/auth/routes';
import { hrmRoutes } from '@/modules/hrm/routes';
import { superAdminRoutes } from '@/modules/super-admin/routes';
import { installGuards } from '@/router/guards';
import { getDefaultRoute } from '@/shared/launcher/getDefaultRoute';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// Top-level router structure (post-Odoo-style refactor):
//
//   /                    →  redirect via getDefaultRoute(user.permissions)
//                           — first registered app the user has access to,
//                             else the launcher.
//
//   /apps                →  LauncherLayout
//     ''                 →  LauncherPlaceholderPage (Session 1)
//                           — replaced by the real LauncherPage in Session 2
//
//   /hrm                 →  HrmAppLayout (meta: { app: 'hrm' })
//     ''                 →  HrmDashboardPlaceholderPage (Session 1)
//                           — replaced by the real HrmDashboardPage Session 2
//     employees          →  EmployeeListPage  (unchanged)
//     ... all existing HRM children                          (unchanged)
//
//   /login, /tenant-suspended  →  public routes, no shell    (unchanged)
//
// Key design properties:
//
//   1. URL space under /hrm/* is UNCHANGED. Every existing bookmark
//      (/hrm/employees/5, /hrm/leave-balances/3, etc.) resolves to the
//      same component — now wrapped in HrmAppLayout instead of the old
//      AppShellLayout. Deep links work for free.
//
//   2. Route NAMES are unchanged. Every existing
//      `RouterLink :to="{ name: 'hrm.employee.detail' }"` keeps working.
//
//   3. `meta: { app: 'hrm' }` on the /hrm parent — Vue Router merges
//      meta down the matched chain; child routes inherit. The
//      AppIdentityBadge reads route.matched[0].meta.app to surface the
//      current app's identity in the top bar.
//
//   4. No /dashboard route. The old generic dashboard is gone; users
//      land on /hrm via getDefaultRoute. Stale bookmarks 404 cleanly
//      via Vue Router's default behaviour (no graceful redirect — this
//      is a feature branch with no production bookmarks to preserve).
//
// Module placeholders (accounting/inventory/procurement/sales) are
// REMOVED from the router. They never had real content; the new
// architecture is "apps that ship get a layout + routes; apps that
// don't, don't exist in the URL space." Future Accounting ships its
// own AccountingAppLayout following the HRM template.
// ─────────────────────────────────────────────────────────────────────────────

const routes: RouteRecordRaw[] = [
    // Root URL — resolves to the user's default app via getDefaultRoute.
    // Function-form redirect so the auth store's current permissions
    // drive the destination at navigation time (not module-load time).
    {
        path: '/',
        meta: { requiresAuth: true },
        redirect: () => {
            const auth = useAuthStore();
            return getDefaultRoute({
                isSuperAdmin: auth.isSuperAdmin,
                entitledModules: auth.entitledModules,
                permissions: auth.permissions,
            });
        },
    },

    // Launcher — /apps. LauncherLayout wraps; the Session-1 placeholder
    // page renders as the '' child. Session 2 swaps in the real
    // LauncherPage (grid of app cards from LAUNCHER_APPS).
    {
        path: '/apps',
        component: () => import('@/shared/layouts/LauncherLayout.vue'),
        meta: { requiresAuth: true },
        children: [
            {
                path: '',
                name: 'launcher',
                component: () => import('@/modules/launcher/pages/LauncherPage.vue'),
            },
        ],
    },

    // HRM app — /hrm. HrmAppLayout wraps every child. The existing
    // hrmRoutes (employees, departments, positions, branches, leave
    // requests, attendance, leave balances + the new dashboard '' child)
    // mount unchanged. meta.app drives AppIdentityBadge.
    {
        path: '/hrm',
        component: () => import('@/shared/layouts/HrmAppLayout.vue'),
        meta: { requiresAuth: true, app: 'hrm' },
        children: hrmRoutes,
    },

    // Admin app — /admin. AdminAppLayout wraps every child. v1 has one
    // child (HRM Settings); Stage 2-5 features land here. meta.app drives
    // AppIdentityBadge (looks up the admin entry via findLauncherApp);
    // hiddenFromLauncher means the launcher + switcher exclude this app
    // from their grids, but the URL space + identity badge are real.
    {
        path: '/admin',
        component: () => import('@/shared/layouts/AdminAppLayout.vue'),
        meta: { requiresAuth: true, app: 'admin' },
        children: adminRoutes,
    },

    // Super Admin Portal — /super-admin. FOURTH per-app layout
    // (Session 5 of the SA Portal slice). meta.requiresSuperAdmin is
    // the route guard hook: non-SA users hitting any /super-admin/*
    // URL get 404 via the catch-all NotFoundPage (Q8 — security-
    // through-obscurity, matches the backend's SuperAdminGuard
    // middleware disposition).
    {
        path: '/super-admin',
        component: () => import('@/shared/layouts/SuperAdminAppLayout.vue'),
        meta: { requiresAuth: true, requiresSuperAdmin: true, app: 'super-admin' },
        children: superAdminRoutes,
    },

    // Public routes — no shell. /login + /tenant-suspended.
    ...authRoutes,

    // Module-not-entitled — friendly 403 page for the
    // module_not_entitled case. Distinct from the catch-all 404 because
    // the user IS authenticated + their tenant simply doesn't (or
    // doesn't anymore) have access to the module. Reached by the axios
    // interceptor when ANY /api/v1/* response returns 403 +
    // error_code=module_not_entitled. The ?module=<key> query param
    // carries the affected module key for the page's specific copy.
    {
        path: '/module-disabled',
        name: 'module-not-entitled',
        component: () => import('@/shared/components/state/ModuleNotEntitledPage.vue'),
        meta: { requiresAuth: true },
    },

    // Catch-all 404 — renders the existing NotFoundPage component.
    // Two consumer paths land here:
    //   1. Unmatched URLs (typos, stale bookmarks against removed
    //      routes).
    //   2. The SA-guard rejection (non-SA hitting /super-admin/* per
    //      Q8 — see guards.ts). The route effectively doesn't exist
    //      for them.
    // requiresAuth: false so the 404 renders for both authenticated
    // and unauthenticated callers; the page itself doesn't disclose
    // tenant or user data.
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/shared/components/state/NotFoundPage.vue'),
        meta: { requiresAuth: false },
    },
];

// Dev-only routes. Guarded by `import.meta.env.DEV` so Vite tree-shakes
// them out of production. The playground chunks never ship to prod.
if (import.meta.env.DEV) {
    routes.push({
        path: '/__dev/tokens',
        name: 'dev-tokens',
        component: () => import('@/dev/TokensPlaygroundPage.vue'),
        meta: { requiresAuth: false },
    });

    routes.push({
        path: '/__dev/components',
        name: 'dev-components',
        component: () => import('@/dev/ComponentsPlaygroundPage.vue'),
        meta: { requiresAuth: false },
    });
}

const router = createRouter({
    history: createWebHistory(),
    routes,
});

installGuards(router);

export default router;
