import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    createMemoryHistory,
    createRouter,
    type Router,
    type RouteRecordRaw,
} from 'vue-router';

import { installGuards } from '@/router/guards';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// Route guard specs.
//
// Build a minimal router with representative routes — protected /, public
// /login, public /tenant-suspended, and a public /__dev/... — and exercise
// every branch of the guard's precedence rules.
// ─────────────────────────────────────────────────────────────────────────────

const STUB = { template: '<div />' };

const ROUTES: RouteRecordRaw[] = [
    { path: '/', name: 'home', component: STUB, meta: { requiresAuth: true } },
    {
        path: '/login',
        name: 'login',
        component: STUB,
        meta: { requiresAuth: false, requiresGuest: true },
    },
    {
        path: '/tenant-suspended',
        name: 'tenant-suspended',
        component: STUB,
        meta: { requiresAuth: false, allowTenantInactive: true },
    },
    {
        path: '/__dev/anything',
        name: 'dev-anything',
        component: STUB,
        meta: { requiresAuth: false },
    },
];

function buildRouter(): Router {
    const router = createRouter({ history: createMemoryHistory(), routes: ROUTES });
    installGuards(router);
    return router;
}

describe('route guards', () => {
    let router: Router;

    beforeEach(async () => {
        setActivePinia(createPinia());
        router = buildRouter();
        // Start the router at a public route so individual tests can push
        // anywhere without colliding with an initial guard-driven redirect.
        // (Memory history starts at START_LOCATION; isReady() needs a push.)
        await router.push({ name: 'dev-anything' });
        await router.isReady();
    });

    afterEach(() => {
        // No teardown necessary — fresh pinia per test.
    });

    it('unauthenticated user navigating to a protected route is redirected to /login with ?redirect', async () => {
        // Default state: no user. Try to navigate.
        await router.push('/');
        expect(router.currentRoute.value.name).toBe('login');
        expect(router.currentRoute.value.query.redirect).toBe('/');
    });

    it('authenticated user hitting /login is redirected to the ?redirect target', async () => {
        const auth = useAuthStore();
        auth.$patch({
            user: { id: 1, name: 'X', email: 'x', email_verified_at: null },
            tenant: {
                id: 1,
                slug: 'x',
                name: 'X',
                country_code: 'KH',
                default_currency: 'USD',
                functional_currency: 'USD',
                timezone: 'Asia/Phnom_Penh',
            },
        });

        await router.push({ name: 'login', query: { redirect: '/' } });
        expect(router.currentRoute.value.path).toBe('/');
    });

    it('tenantInactive overrides everything except /tenant-suspended itself', async () => {
        const auth = useAuthStore();
        auth.$patch({ tenantInactive: true });

        // Attempt protected route → tenant-suspended.
        await router.push('/');
        expect(router.currentRoute.value.name).toBe('tenant-suspended');

        // Attempt login → still routed to tenant-suspended.
        await router.push({ name: 'login' });
        expect(router.currentRoute.value.name).toBe('tenant-suspended');
    });

    it('tenant-suspended page is reachable while tenantInactive=true', async () => {
        const auth = useAuthStore();
        auth.$patch({ tenantInactive: true });

        await router.push({ name: 'tenant-suspended' });
        expect(router.currentRoute.value.name).toBe('tenant-suspended');
    });

    it('public routes (requiresAuth=false) bypass auth checks', async () => {
        // No user authenticated. Public route should still resolve.
        await router.push({ name: 'dev-anything' });
        expect(router.currentRoute.value.name).toBe('dev-anything');
    });

    it('nested children inherit requiresAuth from a shell-layout parent', async () => {
        // Mirrors the production router shape: a layout parent with
        // requiresAuth=true and unannotated children. The guard must see
        // the merged meta on the matched child and redirect to /login.
        const NESTED_ROUTES: RouteRecordRaw[] = [
            {
                path: '/',
                component: STUB,
                meta: { requiresAuth: true },
                children: [
                    { path: '', name: 'dashboard', component: STUB },
                    { path: 'reports', name: 'reports', component: STUB },
                ],
            },
            { path: '/login', name: 'login', component: STUB, meta: { requiresAuth: false } },
            { path: '/__dev/anything', name: 'dev-anything', component: STUB, meta: { requiresAuth: false } },
        ];
        setActivePinia(createPinia());
        const nestedRouter = createRouter({
            history: createMemoryHistory(),
            routes: NESTED_ROUTES,
        });
        installGuards(nestedRouter);
        await nestedRouter.push({ name: 'dev-anything' });
        await nestedRouter.isReady();

        // Unauthenticated → push to dashboard (child of /). Guard should
        // read the inherited requiresAuth=true and redirect to /login
        // with ?redirect=/.
        await nestedRouter.push('/');
        expect(nestedRouter.currentRoute.value.name).toBe('login');
        expect(nestedRouter.currentRoute.value.query.redirect).toBe('/');

        // Same expectation for a deeper nested child path.
        await nestedRouter.push({ name: 'dev-anything' });
        await nestedRouter.push('/reports');
        expect(nestedRouter.currentRoute.value.name).toBe('login');
        expect(nestedRouter.currentRoute.value.query.redirect).toBe('/reports');
    });
});
