import type { RouteLocationNormalized, Router } from 'vue-router';

import { AUTH_ROUTES } from '@/modules/auth/routes';
import { bootstrapAuth } from '@/shared/composables/useAuthBootstrap';
import { getDefaultRoute } from '@/shared/launcher/getDefaultRoute';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// Route guards.
//
// Precedence (highest to lowest):
//   0. !auth.initialized                       →  await bootstrapAuth()
//   1. tenantInactive + !allowTenantInactive  →  /tenant-suspended
//   2. requiresAuth + !isAuthenticated        →  /login?redirect=<to.fullPath>
//   3. requiresGuest + isAuthenticated        →  ?redirect or /
//   4. proceed
//
// Conventions on route.meta:
//   - requiresAuth: boolean   (default true; mark false on login,
//                              tenant-suspended, dev playgrounds)
//   - requiresGuest: boolean  (true on /login only — bounces logged-in users)
//   - allowTenantInactive: boolean (true on tenant-suspended only)
// ─────────────────────────────────────────────────────────────────────────────

function isAuthRequired(to: RouteLocationNormalized): boolean {
    // Default is "authenticated required" — every page in an ERP is behind
    // auth. Routes opt OUT via `meta.requiresAuth: false`.
    return to.meta.requiresAuth !== false;
}

export function installGuards(router: Router): void {
    router.beforeEach(async (to) => {
        const auth = useAuthStore();

        // Correctness invariant: the guard MUST NOT evaluate auth state
        // before bootstrap has resolved. main.ts orders `bootstrapAuth()`
        // before `app.use(router)` so the initial navigation guard sees
        // populated state — but a route guard that depends on uninitialized
        // auth state is a latent bug regardless of init order. This check
        // makes the guard self-protect, in flow with both the initial
        // navigation and any future imperative `router.push()` that could
        // run before bootstrap completes.
        //
        // bootstrapAuth() is idempotent: returns the cached/in-flight
        // promise on subsequent calls. Once initialized, the await
        // collapses to a no-op.
        if (!auth.initialized) {
            await bootstrapAuth();
        }

        // Tenant-inactive interception.
        if (auth.tenantInactive && to.meta.allowTenantInactive !== true) {
            return { name: AUTH_ROUTES.TENANT_SUSPENDED };
        }

        // Authenticated-only gate.
        if (isAuthRequired(to) && !auth.isAuthenticated) {
            return {
                name: AUTH_ROUTES.LOGIN,
                query: { redirect: to.fullPath },
            };
        }

        // Guest-only gate (login page). Bounce already-authenticated
        // users via the explicit ?redirect= when present, else through
        // getDefaultRoute() — same single-source destination logic the
        // LoginPage success path uses.
        if (to.meta.requiresGuest === true && auth.isAuthenticated) {
            const explicitRedirect = to.query.redirect as string | undefined;
            return explicitRedirect && explicitRedirect.length > 0
                ? explicitRedirect
                : getDefaultRoute(auth.permissions);
        }

        return true;
    });
}
