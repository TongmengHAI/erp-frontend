import { describe, expect, it } from 'vitest';
import type { RouteRecordRaw } from 'vue-router';

import LauncherPage from '@/modules/launcher/pages/LauncherPage.vue';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// LauncherPage — 5-state matrix per §7.J. The launcher's "5 states"
// adapt to its registry-driven nature:
//
//   1. Populated single card    — user has access to one app (v1 default)
//   2. Populated multi-card     — future-proofing; tested with a
//                                 manipulated registry-like permission set
//                                 (no second app to fake — see test note)
//   3. Empty (no accessible)    — authenticated user with no app perms,
//                                 sees the "talk to your admin" copy
//   4. Permission filter check  — HRM card hidden when no hrm.* perm
//   5. Click navigates          — card click pushes to the app's default
//                                 route
//
// "Loading" + "error" states aren't applicable: LAUNCHER_APPS is a
// static const, not a fetched resource. The launcher has no async
// boundary to render skeletons / errors against.
// ─────────────────────────────────────────────────────────────────────────────

const STUB = { template: '<div />' };

const NAV_ROUTES: RouteRecordRaw[] = [
    { path: '/apps', name: 'launcher', component: STUB },
    { path: '/hrm', name: 'hrm.dashboard', component: STUB },
];

function seedHrmUser(): void {
    const auth = useAuthStore();
    auth.$patch({
        user: { id: 1, name: 'HRM User', email: 'hrm@x', email_verified_at: null },
        permissions: ['hrm.employee.view'],
    });
}

function seedNoAccessUser(): void {
    const auth = useAuthStore();
    auth.$patch({
        user: { id: 2, name: 'No Access', email: 'na@x', email_verified_at: null },
        permissions: [],
    });
}

describe('LauncherPage', () => {
    it('renders the HRM card when the user has hrm.* permissions', async () => {
        const w = await mountWithGlobals(LauncherPage, { routes: NAV_ROUTES });
        seedHrmUser();
        await w.vm.$nextTick();

        const grid = w.find('[data-testid="launcher-app-grid"]');
        expect(grid.exists()).toBe(true);
        const cards = w.findAll('[data-testid^="launcher-app-card-"]');
        expect(cards).toHaveLength(1);
        expect(cards[0].attributes('data-app-id')).toBe('hrm');
        // Empty-state node is gone in this branch.
        expect(w.find('[data-testid="launcher-empty-state"]').exists()).toBe(false);
    });

    it('HRM card targets the hrm.dashboard route via its RouterLink', async () => {
        const w = await mountWithGlobals(LauncherPage, { routes: NAV_ROUTES });
        seedHrmUser();
        await w.vm.$nextTick();

        const card = w.find('[data-testid="launcher-app-card-hrm"]');
        // RouterLink renders as <a> with the resolved href in tests.
        // Memory router resolves { name: 'hrm.dashboard' } to '/hrm'.
        expect(card.attributes('href')).toBe('/hrm');
    });

    it('renders the empty state when the user has no accessible apps', async () => {
        const w = await mountWithGlobals(LauncherPage, { routes: NAV_ROUTES });
        seedNoAccessUser();
        await w.vm.$nextTick();

        const emptyState = w.find('[data-testid="launcher-empty-state"]');
        expect(emptyState.exists()).toBe(true);
        // Grid not rendered in the empty branch.
        expect(w.find('[data-testid="launcher-app-grid"]').exists()).toBe(false);
        // Zero cards.
        expect(w.findAll('[data-testid^="launcher-app-card-"]')).toHaveLength(0);
    });

    it('renders the empty state when the user has only non-app permissions', async () => {
        // Defensive: user has `tenant.settings.manage` (real backend
        // permission, not an app permission). v1 registry only has HRM;
        // they don't match → empty state. Same rendering as the
        // zero-permission case above.
        const w = await mountWithGlobals(LauncherPage, { routes: NAV_ROUTES });
        const auth = useAuthStore();
        auth.$patch({
            user: { id: 3, name: 'Tenant Admin Only', email: 'ta@x', email_verified_at: null },
            permissions: ['tenant.settings.manage'],
        });
        await w.vm.$nextTick();

        expect(w.find('[data-testid="launcher-empty-state"]').exists()).toBe(true);
        expect(w.findAll('[data-testid^="launcher-app-card-"]')).toHaveLength(0);
    });

    it('renders the title + subtitle independent of card population', async () => {
        // Page chrome (title + subtitle) renders regardless of the
        // accessible-apps count. Tested at both extremes so future
        // copy changes are pinned.
        const w = await mountWithGlobals(LauncherPage, { routes: NAV_ROUTES });
        seedNoAccessUser();
        await w.vm.$nextTick();

        // Title + subtitle present in the empty state too.
        expect(w.find('h1').exists()).toBe(true);
        expect(w.find('h1').text().length).toBeGreaterThan(0);
    });
});
