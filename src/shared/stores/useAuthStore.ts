import { defineStore } from 'pinia';

// ─────────────────────────────────────────────────────────────────────────────
// useAuthStore — STUB for F2c.
//
// Surfaces the minimal contract every F2c navigation component needs:
//   - state.user: null | AuthUser
//   - getter `isAuthenticated`
//   - getter `can(permission)` → boolean
//   - action `logout()` → clears local state
//
// F3 replaces the body with real API calls:
//   - login(credentials) → POST /api/v1/auth/login
//   - fetchMe()         → GET  /api/v1/auth/me
//   - logout()          → DELETE /api/v1/auth/logout, then $reset()
//
// The $reset() behavior on logout is the locked contract — F3 keeps it.
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    permissions: string[];
}

interface AuthState {
    user: AuthUser | null;
}

export const useAuthStore = defineStore('auth', {
    state: (): AuthState => ({
        user: null,
    }),
    getters: {
        isAuthenticated: (state): boolean => state.user !== null,
        can:
            (state) =>
            (permission: string): boolean =>
                state.user?.permissions.includes(permission) ?? false,
    },
    actions: {
        logout(): void {
            // F2c stub: clear local state only. F3 will await a real API call
            // first, then $reset() on success.
            console.info('[stub] useAuthStore.logout — F3 will wire the API call');
            this.$reset();
        },
    },
});
