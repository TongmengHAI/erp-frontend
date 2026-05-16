import { describe, expect, it } from 'vitest';
import type { RouteRecordRaw } from 'vue-router';

import AppShellLayout from '@/shared/components/layout/AppShellLayout.vue';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

const STUB = { template: '<div data-testid="nested-page">nested</div>' };

const SHELL_ROUTES: RouteRecordRaw[] = [
    {
        path: '/',
        component: AppShellLayout,
        children: [
            {
                path: '',
                name: 'dashboard',
                component: STUB,
                meta: { breadcrumb: 'Dashboard' },
            },
            {
                path: 'accounting',
                name: 'accounting',
                component: STUB,
                meta: { breadcrumb: 'Accounting' },
            },
        ],
    },
    { path: '/login', name: 'login', component: STUB },
    { path: '/hrm', name: 'hrm', component: STUB },
    { path: '/inventory', name: 'inventory', component: STUB },
    { path: '/procurement', name: 'procurement', component: STUB },
    { path: '/sales', name: 'sales', component: STUB },
];

describe('AppShellLayout', () => {
    it('renders sidebar, top bar, and nested route content', async () => {
        const w = await mountWithGlobals(AppShellLayout, {
            routes: SHELL_ROUTES,
            initialRoute: '/',
        });
        // Hydrate auth so AppTopBar renders the avatar trigger.
        const auth = useAuthStore();
        auth.$patch({
            user: { id: 1, name: 'Jane', email: 'j@x', email_verified_at: null },
            permissions: [],
        });
        await w.vm.$nextTick();

        // Sidebar (aria-label="Primary navigation") + top bar (role="banner")
        // both rendered.
        expect(w.find('aside[aria-label="Primary navigation"]').exists()).toBe(true);
        expect(w.find('header[role="banner"]').exists()).toBe(true);

        // Nested page rendered into the layout's <RouterView />.
        expect(w.find('[data-testid="nested-page"]').exists()).toBe(true);
    });

    it('does not render Breadcrumbs when the trail has fewer than 2 items', async () => {
        // Single-item trail (just Dashboard) → Breadcrumbs renders nothing.
        const w = await mountWithGlobals(AppShellLayout, {
            routes: SHELL_ROUTES,
            initialRoute: '/',
        });
        expect(w.find('nav[aria-label="Breadcrumb"]').exists()).toBe(false);
    });

    it('renders Breadcrumbs when nested route adds a second crumb', async () => {
        // Two-item trail scenario: shell-parent contributes "Home", the
        // /accounting child contributes "Accounting". The sibling sidebar
        // stub routes (hrm/inventory/...) must still be registered so
        // AppSidebar's RouterLinks resolve without warnings.
        const ROUTES_WITH_PARENT_CRUMB: RouteRecordRaw[] = [
            {
                path: '/',
                component: AppShellLayout,
                meta: { breadcrumb: 'Home' },
                children: [
                    {
                        path: '',
                        name: 'dashboard',
                        component: STUB,
                    },
                    {
                        path: 'accounting',
                        name: 'accounting',
                        component: STUB,
                        meta: { breadcrumb: 'Accounting' },
                    },
                ],
            },
            // Sidebar's other module link targets — kept flat so RouterLink
            // resolution succeeds; their internals don't matter here.
            { path: '/hrm', name: 'hrm', component: STUB },
            { path: '/inventory', name: 'inventory', component: STUB },
            { path: '/procurement', name: 'procurement', component: STUB },
            { path: '/sales', name: 'sales', component: STUB },
        ];
        const w = await mountWithGlobals(AppShellLayout, {
            routes: ROUTES_WITH_PARENT_CRUMB,
            initialRoute: '/accounting',
        });
        const nav = w.find('nav[aria-label="Breadcrumb"]');
        expect(nav.exists()).toBe(true);
        expect(nav.text()).toContain('Home');
        expect(nav.text()).toContain('Accounting');
    });
});
