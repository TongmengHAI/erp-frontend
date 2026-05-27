import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createMemoryHistory,
    createRouter,
    type Router,
    type RouteRecordRaw,
} from 'vue-router';

import * as authApi from '@/modules/auth/api/auth';
import { installGuards } from '@/router/guards';
import { __testing as bootstrapTesting } from '@/shared/composables/useAuthBootstrap';
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
    // Post-nav-refactor: the guest-gate falls back to getDefaultRoute()
    // when no ?redirect is supplied. These two stubs register the
    // target routes (launcher for users with no app perms; hrm.dashboard
    // for users with hrm.*) so the redirect resolves in tests.
    { path: '/apps', name: 'launcher', component: STUB },
    { path: '/hrm', name: 'hrm.dashboard', component: STUB, meta: { requiresAuth: true } },
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
        // Reset bootstrapAuth's module-scoped cache so each test starts
        // from a clean "not yet bootstrapped" state. Tests that exercise
        // the defensive bootstrap path mock authApi.me; tests that exercise
        // the existing precedence rules pre-set initialized=true.
        bootstrapTesting.reset();
        router = buildRouter();

        // Default: mark auth as already initialized so the defensive
        // bootstrap check in the guard is a no-op. Tests that need to
        // exercise the bootstrap path override this AFTER buildRouter()
        // but BEFORE pushing.
        useAuthStore().initialized = true;

        // Start the router at a public route so individual tests can push
        // anywhere without colliding with an initial guard-driven redirect.
        // (Memory history starts at START_LOCATION; isReady() needs a push.)
        await router.push({ name: 'dev-anything' });
        await router.isReady();
    });

    afterEach(() => {
        vi.restoreAllMocks();
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

    it('authenticated user with hrm.* hitting /login (no ?redirect) is routed to hrm.dashboard via getDefaultRoute', async () => {
        // Guest-gate fallback when no ?redirect is supplied. The
        // gate now routes through getDefaultRoute(auth.permissions);
        // hrm.* permissions → hrm.dashboard.
        const auth = useAuthStore();
        auth.$patch({
            user: { id: 1, name: 'X', email: 'x', email_verified_at: null },
            permissions: ['hrm.employee.view'],
        });

        await router.push({ name: 'login' });
        expect(router.currentRoute.value.name).toBe('hrm.dashboard');
    });

    it('authenticated user with no app perms hitting /login (no ?redirect) is routed to launcher', async () => {
        // Same fallback path, different branch: no hrm.* perms →
        // launcher (zero-card state). The user is authenticated to
        // the tenant but has no app access; landing on the launcher
        // is graceful, 401 would be wrong.
        const auth = useAuthStore();
        auth.$patch({
            user: { id: 2, name: 'Y', email: 'y', email_verified_at: null },
            permissions: [],
        });

        await router.push({ name: 'login' });
        expect(router.currentRoute.value.name).toBe('launcher');
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
        bootstrapTesting.reset();
        // Pre-init auth so the guard's defensive bootstrap check is a no-op
        // — this test exercises meta-inheritance, not bootstrap.
        useAuthStore().initialized = true;
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

    it('regression: defensive guard awaits bootstrap before evaluating auth state', async () => {
        // ─────────────────────────────────────────────────────────────────────
        // REGRESSION GUARD — surfaced during the F4 visual review.
        //
        // Original bug: Vue Router 4's app.use(router) starts initial
        // navigation synchronously. The beforeEach guard's microtask raced
        // against main.ts's await bootstrapAuth(). On any timing jitter
        // (network, lazy chunk loads), the guard fired with empty auth
        // state and redirected to /login, even though the session cookie
        // was valid and /me would have returned 200.
        //
        // The fix has two halves:
        //   1. main.ts: await bootstrapAuth() BEFORE app.use(router) so the
        //      initial nav can only start once state is populated.
        //   2. guards.ts: defensive `if (!auth.initialized) await bootstrap()`
        //      so any guard evaluation — initial OR imperative — waits for
        //      bootstrap. This is the correctness invariant: a guard that
        //      evaluates auth before bootstrap completes has a latent bug
        //      regardless of init order.
        //
        // This test exercises half 2: start with auth.initialized=false,
        // mock /auth/me to return a valid user, push to a protected route,
        // assert the guard ran AFTER bootstrap populated state — navigation
        // succeeds rather than redirecting to /login.
        // ─────────────────────────────────────────────────────────────────────
        setActivePinia(createPinia());
        bootstrapTesting.reset();

        // Mock /auth/me to return a valid user. Resolve immediately so the
        // bootstrap promise resolves on next microtask.
        const meSpy = vi.spyOn(authApi, 'me').mockResolvedValue({
            data: {
                user: {
                    id: 1,
                    name: 'Test User',
                    email: 't@x',
                    email_verified_at: null,
                },
                tenant: {
                    id: 1,
                    slug: 'x',
                    name: 'X',
                    country_code: 'KH',
                    default_currency: 'USD',
                    functional_currency: 'USD',
                    timezone: 'Asia/Phnom_Penh',
                },
                current_company: null,
                companies: [],
                roles: [],
                permissions: [],
            },
        });

        const auth = useAuthStore();
        expect(auth.initialized).toBe(false);
        expect(auth.user).toBeNull();

        const freshRouter = buildRouter();
        await freshRouter.push({ name: 'dev-anything' });
        await freshRouter.isReady();

        // Push to a protected route while auth is uninitialized. The guard
        // must await bootstrap; once it resolves, the populated state is
        // visible and navigation proceeds.
        await freshRouter.push('/');

        expect(meSpy).toHaveBeenCalledTimes(1);
        expect(auth.initialized).toBe(true);
        expect(auth.user?.id).toBe(1);
        expect(freshRouter.currentRoute.value.path).toBe('/');
    });
});
