import { watch } from 'vue';

import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useTenantStore } from '@/shared/stores/useTenantStore';

// ─────────────────────────────────────────────────────────────────────────────
// useAuthBootstrap — wiring that lives at the app boundary.
//
// Two distinct concerns, two distinct functions:
//
//   1. bootstrapAuth() — called once from main.ts before app.mount().
//      Calls fetchMe() so the initial route render has accurate auth state.
//      Failures (network / 5xx) are swallowed: the user lands unauthenticated,
//      and the route guard redirects to /login. 401 is the expected "no
//      session" outcome and is handled inside fetchMe.
//
//   2. installAuthAppHooks() — called once from App.vue setup. Installs:
//        - tenant mirror watch (auth.tenant → tenant.current)
//        - focus/visibilitychange listener that refetches /me, throttled to
//          30s and gated by isAuthenticated (no /me spam from /login or from
//          a freshly logged-out tab).
//
// Splitting the two lets bootstrap finish before Pinia/router render, while
// keeping the lifecycle-bound listeners inside the Vue tree.
// ─────────────────────────────────────────────────────────────────────────────

let bootstrapPromise: Promise<void> | null = null;

export function bootstrapAuth(): Promise<void> {
    if (bootstrapPromise) return bootstrapPromise;
    const auth = useAuthStore();
    bootstrapPromise = auth
        .fetchMe()
        .catch((e: unknown) => {
            // 401 is handled inside fetchMe (state cleared). Anything else
            // is logged but doesn't block boot — the user gets the login
            // page with a clean slate.
            console.warn('[bootstrapAuth] /auth/me failed during boot:', e);
        })
        .finally(() => {
            auth.initialized = true;
        });
    return bootstrapPromise;
}

const REFRESH_THROTTLE_MS = 30_000;
let lastRefresh = 0;
let listenersInstalled = false;

export function installAuthAppHooks(): void {
    const auth = useAuthStore();
    const tenant = useTenantStore();

    // Mirror auth.tenant → tenant.current. `immediate: true` covers the
    // post-bootstrap initial value.
    watch(
        () => auth.tenant,
        (next) => tenant.$patch({ current: next }),
        { immediate: true },
    );

    if (listenersInstalled || typeof window === 'undefined') return;
    listenersInstalled = true;

    async function maybeRefresh(): Promise<void> {
        if (!auth.isAuthenticated) return;
        const now = Date.now();
        if (now - lastRefresh < REFRESH_THROTTLE_MS) return;
        lastRefresh = now;
        await auth.fetchMe().catch(() => {
            /* surfaced via state changes; nothing to do here */
        });
    }

    window.addEventListener('focus', maybeRefresh);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) void maybeRefresh();
    });
}

/**
 * Test-only helpers.
 */
export const __testing = {
    reset(): void {
        bootstrapPromise = null;
        lastRefresh = 0;
        listenersInstalled = false;
    },
};
