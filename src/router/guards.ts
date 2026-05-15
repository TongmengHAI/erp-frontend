import type { RouteLocationNormalized, Router } from 'vue-router';

import { AUTH_ROUTES } from '@/modules/auth/routes';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// Route guards.
//
// Precedence (highest to lowest):
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
    router.beforeEach((to) => {
        const auth = useAuthStore();

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

        // Guest-only gate (login page).
        if (to.meta.requiresGuest === true && auth.isAuthenticated) {
            const redirect = (to.query.redirect as string) || '/';
            return redirect;
        }

        return true;
    });
}
