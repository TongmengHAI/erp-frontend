import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'home',
        component: () => import('@/shared/views/HomeView.vue'),
    },
];

// Dev-only routes. The `import.meta.env.DEV` branch is statically evaluable, so
// Vite tree-shakes the TokensPlaygroundPage chunk out of production builds.
if (import.meta.env.DEV) {
    routes.push({
        path: '/__dev/tokens',
        name: 'dev-tokens',
        component: () => import('@/dev/TokensPlaygroundPage.vue'),
    });
}

export default createRouter({
    history: createWebHistory(),
    routes,
});
