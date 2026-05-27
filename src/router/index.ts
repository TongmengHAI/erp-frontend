import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import { authRoutes } from '@/modules/auth/routes';
import { hrmRoutes } from '@/modules/hrm/routes';
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
            return getDefaultRoute(auth.permissions);
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
                component: () => import('@/modules/launcher/pages/LauncherPlaceholderPage.vue'),
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

    // Public routes — no shell. /login + /tenant-suspended.
    ...authRoutes,
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
