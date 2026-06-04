import ToastService from 'primevue/toastservice';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import type { RouteRecordRaw } from 'vue-router';

import TenantFormPage from '@/modules/super-admin/pages/TenantFormPage.vue';
import * as tenantsApi from '@/modules/super-admin/api/tenants';
import { tenantQueryKeys } from '@/modules/super-admin/composables/tenantQueryKeys';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// TenantFormPage — regression tests pinning the edit-mode mount path.
//
// The load-bearing scenario is the WARM-CACHE navigate-from-detail
// mount: the SA viewed the tenant detail page (which populated the
// tenant detail query), then clicked Edit. The form mounts with the
// cache already warm, so the `watch(editData, ..., { immediate: true })`
// fires SYNCHRONOUSLY during setup with the cached tenant payload.
//
// A previous bug had the watch's body touching refs declared LATER in
// the script — synchronous fire-during-setup hit a TDZ ReferenceError,
// setup() threw, and the whole page rendered blank. Hard-reload masked
// the bug because the cold cache made the watch early-return before
// touching the refs. This spec covers the warm-cache path so that
// regression cannot reappear silently.
// ─────────────────────────────────────────────────────────────────────────────

const SA_TEST_ROUTES: RouteRecordRaw[] = [
    { path: '/', name: 'home', component: { template: '<div />' } },
    { path: '/apps', name: 'launcher', component: { template: '<div />' } },
    {
        path: '/super-admin/tenants',
        name: 'super-admin.tenants.list',
        component: { template: '<div />' },
    },
    {
        path: '/super-admin/tenants/:id',
        name: 'super-admin.tenants.detail',
        component: { template: '<div />' },
    },
    {
        path: '/super-admin/tenants/:id/edit',
        name: 'super-admin.tenants.edit',
        component: TenantFormPage,
    },
];

const TENANT_DATA = {
    data: {
        id: 4,
        slug: 'tongmeng-hai',
        name: 'TONGMENG HAI',
        legal_name: null,
        country_code: 'KH',
        default_currency: 'USD',
        functional_currency: 'USD',
        timezone: 'Asia/Phnom_Penh',
        status: 'active' as const,
        created_at: '2026-06-04T12:00:00+00:00',
        updated_at: '2026-06-04T12:00:00+00:00',
    },
};

// Build a QueryClient with the tenant detail query PRE-CACHED — this
// mirrors the live "user viewed detail page, then clicked Edit"
// scenario. retry: false prevents flaky transitions in test.
function warmCacheQueryClient() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(tenantQueryKeys.detail(4), TENANT_DATA);
    return [VueQueryPlugin, { queryClient: client }] as const;
}

function coldCacheQueryClient() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return [VueQueryPlugin, { queryClient: client }] as const;
}

describe('TenantFormPage (edit mode)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('LOAD-BEARING regression: warm cache navigate-from-detail mounts cleanly and renders the form', async () => {
        // The previous TDZ-ReferenceError bug killed setup() before
        // any DOM was emitted. Assertions: the form's section header
        // renders (proof setup() completed without throwing), and the
        // name input carries the cached tenant's value.
        vi.spyOn(tenantsApi, 'getTenant').mockResolvedValue(TENANT_DATA);

        const w = await mountWithGlobals(TenantFormPage, {
            props: { id: 4 },
            extraPlugins: [ToastService, warmCacheQueryClient()],
            routes: SA_TEST_ROUTES,
            initialRoute: '/super-admin/tenants/4/edit',
        });

        // Settle the synchronous warm-cache watch + microtasks.
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 20));
        await w.vm.$nextTick();

        // Form's name input is bound to values.name; warm-cache
        // setValues should have populated it from TENANT_DATA.
        const nameInput = w.find('[data-testid="tenant-form-name"]');
        expect(nameInput.exists()).toBe(true);
        expect((nameInput.element as HTMLInputElement).value).toBe('TONGMENG HAI');

        // Slug too — proves the watch ran without throwing on
        // slugManuallyEdited.value assignment.
        const slugInput = w.find('[data-testid="tenant-form-slug"]');
        expect((slugInput.element as HTMLInputElement).value).toBe('tongmeng-hai');
    });

    it('cold cache mount renders loading state then form when query settles', async () => {
        // The other branch of the bug's hypothesis — cold cache made
        // the watch early-return on the immediate fire, so refs got
        // declared before any data arrived. Test pins this still works.
        vi.spyOn(tenantsApi, 'getTenant').mockResolvedValue(TENANT_DATA);

        const w = await mountWithGlobals(TenantFormPage, {
            props: { id: 4 },
            extraPlugins: [ToastService, coldCacheQueryClient()],
            routes: SA_TEST_ROUTES,
            initialRoute: '/super-admin/tenants/4/edit',
        });

        // Loading state on first paint.
        expect(w.find('[data-testid="tenant-form-loading"]').exists()).toBe(true);

        // Settle the query.
        await new Promise((resolve) => setTimeout(resolve, 100));
        await w.vm.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await w.vm.$nextTick();

        // Loading gone, form present, populated.
        expect(w.find('[data-testid="tenant-form-loading"]').exists()).toBe(false);
        const nameInput = w.find('[data-testid="tenant-form-name"]');
        expect(nameInput.exists()).toBe(true);
        expect((nameInput.element as HTMLInputElement).value).toBe('TONGMENG HAI');
    });
});
