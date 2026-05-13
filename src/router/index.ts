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

    // Stub `dashboard` named route. Several shared components (
    // PermissionDeniedPage, NotFoundPage) link to { name: 'dashboard' } as the
    // default fallback action. F4 will register the real route at `/` →
    // DashboardPlaceholderPage and DELETE this stub. Until then, clicking the
    // default action from the playground redirects somewhere harmless rather
    // than logging a "no match for route name 'dashboard'" warning on every
    // playground load. (Console noise costs us when real warnings appear in
    // later slices.)
    routes.push({
        path: '/__dev/dashboard-stub',
        name: 'dashboard',
        redirect: { name: 'dev-components' },
    });
}

export default createRouter({
    history: createWebHistory(),
    routes,
});
