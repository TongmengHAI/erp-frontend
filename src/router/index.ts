import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import { authRoutes } from '@/modules/auth/routes';
import { DASHBOARD_ROUTES } from '@/modules/dashboard/routes';
import { hrmRoutes, HRM_ROUTES } from '@/modules/hrm/routes';
import { installGuards } from '@/router/guards';

// ─────────────────────────────────────────────────────────────────────────────
// Breadcrumb convention (consumed by F2c's Breadcrumbs component via
// route.matched[*].meta.breadcrumb):
//   - Static label:  meta: { breadcrumb: 'Dashboard' }
//   - Dynamic label: meta: { breadcrumb: (route) => `Entry ${route.params.id}` }
// Breadcrumbs auto-skip route records that omit the meta key (typical for
// the layout parent itself). Trails with fewer than 2 items render nothing.
//
// Module-placeholder convention (temporary, until each domain ships):
// Routes under the shell with `meta.moduleLabel` render
// ModuleComingSoonPage.vue. When a module ships its real Phase content,
// the slice swaps the `component` and drops `moduleLabel` from the route
// definition. The route name, path, and breadcrumb meta stay the same —
// no callsite changes anywhere else. shared-stubs/ disappears entirely
// once the last module ships.
// ─────────────────────────────────────────────────────────────────────────────

const moduleComingSoon = (): Promise<typeof import('@/modules/shared-stubs/pages/ModuleComingSoonPage.vue')> =>
    import('@/modules/shared-stubs/pages/ModuleComingSoonPage.vue');

const routes: RouteRecordRaw[] = [
    // Authenticated shell — every page mounted as a child here renders
    // inside the AppSidebar + AppTopBar + Breadcrumbs chrome.
    // requiresAuth inherits to all children via Vue Router's meta merge.
    {
        path: '/',
        component: () => import('@/shared/components/layout/AppShellLayout.vue'),
        meta: { requiresAuth: true },
        children: [
            {
                path: '',
                name: DASHBOARD_ROUTES.DASHBOARD,
                component: () => import('@/modules/dashboard/pages/DashboardPlaceholderPage.vue'),
                meta: { breadcrumb: 'Dashboard' },
            },
            // ── HRM ──────────────────────────────────────────────────────
            // E1 slice: the real HRM module. /hrm itself redirects to the
            // employee list; the four employee pages are nested children
            // (list / new / detail / edit) declared in
            // modules/hrm/routes.ts.
            {
                path: 'hrm',
                redirect: { name: HRM_ROUTES.EMPLOYEE_LIST },
                meta: { breadcrumb: 'HRM' },
                children: hrmRoutes,
            },
            // ── Module placeholders ──────────────────────────────────────
            // Each Phase slice swaps the `component` and drops the
            // `moduleLabel` meta when the real module lands. Route name,
            // path, and breadcrumb stay stable across the swap.
            {
                path: 'accounting',
                name: 'accounting',
                component: moduleComingSoon,
                meta: { breadcrumb: 'Accounting', moduleLabel: 'Accounting' },
            },
            {
                path: 'inventory',
                name: 'inventory',
                component: moduleComingSoon,
                meta: { breadcrumb: 'Inventory', moduleLabel: 'Inventory' },
            },
            {
                path: 'procurement',
                name: 'procurement',
                component: moduleComingSoon,
                meta: { breadcrumb: 'Procurement', moduleLabel: 'Procurement' },
            },
            {
                path: 'sales',
                name: 'sales',
                component: moduleComingSoon,
                meta: { breadcrumb: 'Sales', moduleLabel: 'Sales' },
            },
        ],
    },
    // Public routes — no shell. /login and /tenant-suspended.
    ...authRoutes,
];

// Dev-only routes. Guarded by `import.meta.env.DEV` so Vite tree-shakes them
// out of production. The playground chunks never ship to prod.
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

    // No module-name stub routes here anymore — the production routes
    // above own the `hrm`, `accounting`, etc. names. Clicking a module
    // link from the dev playground will navigate into the real shell
    // route, which requires auth. Dev users are typically authenticated
    // locally; if not, the route guard sends them to /login (correct
    // behavior, not a regression).
}

const router = createRouter({
    history: createWebHistory(),
    routes,
});

installGuards(router);

export default router;
