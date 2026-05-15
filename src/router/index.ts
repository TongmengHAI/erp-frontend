import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'home',
        component: () => import('@/shared/views/HomeView.vue'),
    },
];

// Dev-only routes. Both branches below are guarded by `import.meta.env.DEV`,
// which is statically evaluable — Vite tree-shakes them out of the production
// bundle. The playground chunks never ship to prod.
if (import.meta.env.DEV) {
    routes.push({
        path: '/__dev/tokens',
        name: 'dev-tokens',
        component: () => import('@/dev/TokensPlaygroundPage.vue'),
    });

    routes.push({
        path: '/__dev/components',
        name: 'dev-components',
        component: () => import('@/dev/ComponentsPlaygroundPage.vue'),
    });

    // Stub named routes for components/links that target module destinations
    // before the real routes register. PermissionDeniedPage / NotFoundPage
    // link to { name: 'dashboard' }; F2c's AppSidebar links to each module's
    // routeName. Without these stubs every playground load logs "no match
    // for named route" warnings, and console noise costs us when real
    // warnings appear in later slices.
    //
    // F4 registers the real dashboard route; Phase M registers the real
    // module roots. Both deletions reduce this block to nothing.
    const stubRouteNames = [
        'dashboard',
        'hrm',
        'accounting',
        'inventory',
        'procurement',
        'sales',
    ];
    stubRouteNames.forEach((name) => {
        routes.push({
            path: `/__dev/${name}-stub`,
            name,
            redirect: { name: 'dev-components' },
        });
    });
}

export default createRouter({
    history: createWebHistory(),
    routes,
});
