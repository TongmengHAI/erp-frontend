import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'home',
        component: () => import('@/shared/views/HomeView.vue'),
    },
];

export default createRouter({
    history: createWebHistory(),
    routes,
});
