import type { RouteRecordRaw } from 'vue-router';

// ─────────────────────────────────────────────────────────────────────────────
// Auth module routes.
//
// `AUTH_ROUTES` holds the named-route constants so guards, redirects, and
// other modules reference routes without magic strings.
// ─────────────────────────────────────────────────────────────────────────────

export const AUTH_ROUTES = {
    LOGIN: 'login',
    TENANT_SUSPENDED: 'tenant-suspended',
} as const;

export const authRoutes: RouteRecordRaw[] = [
    {
        path: '/login',
        name: AUTH_ROUTES.LOGIN,
        component: () => import('./pages/LoginPage.vue'),
        meta: {
            // Authenticated users hitting /login get bounced to their
            // redirect target (or '/').
            requiresAuth: false,
            requiresGuest: true,
        },
    },
    {
        path: '/tenant-suspended',
        name: AUTH_ROUTES.TENANT_SUSPENDED,
        component: () => import('./pages/TenantSuspendedPage.vue'),
        meta: {
            // Reachable while the user is in the tenant_inactive state
            // (which would otherwise be treated as unauthenticated).
            requiresAuth: false,
            allowTenantInactive: true,
        },
    },
];
