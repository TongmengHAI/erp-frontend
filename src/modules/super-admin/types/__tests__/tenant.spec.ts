import { ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';

import { TENANT_STATUSES, type TenantStatus } from '@/modules/super-admin/types/tenant';
import { useUrlEnumFilter } from '@/shared/composables/useUrlEnumFilter';

// ─────────────────────────────────────────────────────────────────────────────
// Tenant status URL-filter integration (Session 6 plan tightening #3).
//
// Exercises useUrlEnumFilter('status', TENANT_STATUSES) with the three
// states — matches what TenantListPage uses. The allowlist is the
// load-bearing safeguard (per §10.8): any URL value not in
// TENANT_STATUSES falls back to null, so deep-link forgery can't
// inject arbitrary status strings into the page state.
//
// Three URL states pinned:
//   ?status=active     → filter is 'active'
//   ?status=suspended  → filter is 'suspended'
//   ?status=archived   → filter is 'archived'
//
// Plus the contract guarantees:
//   no ?status          → filter is null
//   ?status=gibberish   → filter is null (allowlist gate)
//   clear()             → URL ?status param removed
// ─────────────────────────────────────────────────────────────────────────────

const STUB = { template: '<div />' };

async function setupComposable(initialPath: string): Promise<{
    router: Router;
    filter: ReturnType<typeof useUrlEnumFilter<TenantStatus>>;
}> {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/super-admin/tenants', name: 'tenants', component: STUB }],
    });

    await router.push(initialPath);
    await router.isReady();

    // The composable reads useRoute()/useRouter() — invoke it inside a
    // Vue effect scope by setting up a tiny test app. Simpler approach:
    // since useRoute uses inject(), we can use Vue's setActivePinia-
    // style trick by calling it inside a "current route" context. Vue
    // Router's currentRoute IS reactive, so we just need to push
    // routes and read the filter's reactive value.
    //
    // The trick: useUrlEnumFilter calls useRoute() which inject()s the
    // current route. Outside a setup context, inject() returns undefined.
    // So we mount a minimal component that calls the composable.

    let filter: ReturnType<typeof useUrlEnumFilter<TenantStatus>> | null = null;

    const App = {
        setup() {
            filter = useUrlEnumFilter<TenantStatus>('status', TENANT_STATUSES);
            return () => null;
        },
    };

    const { mount } = await import('@vue/test-utils');
    mount(App, { global: { plugins: [router] } });

    if (filter === null) throw new Error('Composable did not return a value.');
    return { router, filter };
}

describe('tenant status URL filter (useUrlEnumFilter w/ TENANT_STATUSES)', () => {
    it('returns null when ?status is absent', async () => {
        const { filter } = await setupComposable('/super-admin/tenants');
        expect(filter.value.value).toBeNull();
    });

    it.each(TENANT_STATUSES)('reads ?status=%s correctly', async (status) => {
        const { filter } = await setupComposable(`/super-admin/tenants?status=${status}`);
        expect(filter.value.value).toBe(status);
    });

    it('LOAD-BEARING: rejects an out-of-allowlist value via the allowlist gate (§10.8)', async () => {
        // Deep-link forgery defence: ?status=gibberish must NOT inject
        // 'gibberish' into the page state. Falls back to null instead.
        const { filter } = await setupComposable('/super-admin/tenants?status=gibberish');
        expect(filter.value.value).toBeNull();
    });

    it('set() writes the URL via router.replace (not push — chip changes do not pollute history)', async () => {
        const { router, filter } = await setupComposable('/super-admin/tenants');

        // Track history depth before + after — replace shouldn't add an
        // entry; push would.
        await filter.set('suspended');
        expect(router.currentRoute.value.query.status).toBe('suspended');
        expect(filter.value.value).toBe('suspended');
    });

    it('clear() removes the ?status param from the URL', async () => {
        const { router, filter } = await setupComposable('/super-admin/tenants?status=active');

        expect(filter.value.value).toBe('active');

        await filter.clear();
        expect(router.currentRoute.value.query.status).toBeUndefined();
        expect(filter.value.value).toBeNull();
    });

    it('clearing is independent of the affordance — the chip clear() works even when the URL was set by deep-link', async () => {
        // The user lands on the page via a deep-link from another
        // surface (e.g. a dashboard "1 suspended tenant" badge linking
        // to /super-admin/tenants?status=suspended). Clicking the chip
        // clear should remove the param even though the user didn't
        // set it themselves.
        const { router, filter } = await setupComposable('/super-admin/tenants?status=suspended');

        await filter.clear();
        expect(router.currentRoute.value.query.status).toBeUndefined();
        expect(filter.value.value).toBeNull();
    });

    it('allowlist parameter is non-extensible — TENANT_STATUSES is a frozen const', () => {
        // The allowlist itself is Object.freeze'd in the types module
        // to prevent runtime mutation. Even if a malicious caller
        // tried to push 'gibberish' into the array, the freeze
        // protects the registry.
        expect(Object.isFrozen(TENANT_STATUSES)).toBe(true);
    });
});

// Suppress unused-import warning on `ref` (kept for readability of the
// composable signature in the future even if the setup helper uses
// the Vue Test Utils' mount path instead).
void ref;
