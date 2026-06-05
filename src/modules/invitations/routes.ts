import type { RouteRecordRaw } from 'vue-router';

// ─────────────────────────────────────────────────────────────────────────────
// Public invitation routes — no auth guard. The invitee hasn't signed
// up yet; they reach this URL via the link in the invitation email.
// ─────────────────────────────────────────────────────────────────────────────

export const INVITATION_ROUTES = {
    ACCEPT: 'invitations.accept',
} as const;

export const invitationRoutes: RouteRecordRaw[] = [
    {
        // The backend's token shape is Str::random(43) — 43 URL-safe
        // base64 chars. The route regex matches the same shape so a
        // malformed token (typo, wrong length, non-base64 chars) falls
        // through to the catch-all 404 BEFORE the page mounts and
        // tries to fetch.
        path: '/invitation/:token([A-Za-z0-9]{43})',
        name: INVITATION_ROUTES.ACCEPT,
        component: () => import('./pages/AcceptInvitationPage.vue'),
        meta: {
            requiresAuth: false,
            // The invitee will become authenticated on successful
            // accept; until then they're a guest, but unlike /login
            // they SHOULDN'T be bounced to getDefaultRoute if a
            // logged-in user lands here (multi-user laptop, etc.).
            // No requiresGuest flag.
        },
    },
];
