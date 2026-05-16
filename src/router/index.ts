import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import { authRoutes } from '@/modules/auth/routes';
import { DASHBOARD_ROUTES } from '@/modules/dashboard/routes';
import { installGuards } from '@/router/guards';

// ─────────────────────────────────────────────────────────────────────────────
// Breadcrumb convention (consumed by F2c's Breadcrumbs component via
// route.matched[*].meta.breadcrumb):
//   - Static label:  meta: { breadcrumb: 'Dashboard' }
//   - Dynamic label: meta: { breadcrumb: (route) => `Entry ${route.params.id}` }
// Breadcrumbs auto-skip route records that omit the meta key (typical for
// the layout parent itself). Add the meta on each leaf or intermediate
// route that should appear in the trail. Trails with fewer than 2 items
// render nothing — Dashboard alone won't show a single-item crumb.
// ─────────────────────────────────────────────────────────────────────────────

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
            // Phase modules (HRM, Accounting, Inventory, Procurement, Sales)
            // land here as additional children. Each will own its own
            // routes.ts and export a children fragment to splice in.
        ],
    },
    // Public routes — no shell. /login and /tenant-suspended.
    ...authRoutes,
];

// Dev-only routes. Both branches below are guarded by `import.meta.env.DEV`,
// which is statically evaluable — Vite tree-shakes them out of the production
// bundle. The playground chunks never ship to prod.
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

    // Stub named routes for sidebar modules that haven't shipped yet.
    // F2c's AppSidebar links to each via `{ name: 'hrm' }` etc.; without
    // a registered route Vue Router warns "no match for named route" on
    // every playground load.
    //
    // Each stub redirects to the dashboard — clicking an unshipped
    // module is a calm no-op rather than an error or a placeholder page.
    // As each domain ships, its real route replaces the stub (delete
    // the entry here, register the real one as a child of the shell).
    const stubModuleNames = [
        'hrm',
        'accounting',
        'inventory',
        'procurement',
        'sales',
    ];
    stubModuleNames.forEach((name) => {
        routes.push({
            path: `/__dev/${name}-stub`,
            name,
            redirect: { name: DASHBOARD_ROUTES.DASHBOARD },
            meta: { requiresAuth: false },
        });
    });
}

const router = createRouter({
    history: createWebHistory(),
    routes,
});

installGuards(router);

export default router;
