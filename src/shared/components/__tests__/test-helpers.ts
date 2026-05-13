import { mount, type VueWrapper } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import type { Component, Plugin } from 'vue';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';

import { i18n } from '@/shared/i18n';
import ErpPreset from '@/shared/styles/primevue-preset';

// ─────────────────────────────────────────────────────────────────────────────
// Shared test helpers for component specs.
//
// `mountWithGlobals(Component, opts)` wires up i18n + a memory-history router
// so components depending on `useI18n()` or `<RouterLink>` mount without
// per-test boilerplate.
//
// The options type is intentionally permissive (`Record<string, unknown>`) —
// this is a test utility and Vue Test Utils' generic typing for `mount` is
// notoriously brittle. The tradeoff is that callers don't get strict prop
// typing on the helper itself; they still get it on the component under test.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_ROUTES: RouteRecordRaw[] = [
    { path: '/', name: 'home', component: { template: '<div />' } },
    { path: '/dashboard', name: 'dashboard', component: { template: '<div />' } },
];

export function createTestRouter(routes: RouteRecordRaw[] = DEFAULT_ROUTES) {
    return createRouter({
        history: createMemoryHistory(),
        routes,
    });
}

interface MountWithGlobalsOpts {
    props?: Record<string, unknown>;
    slots?: Record<string, string>;
    attachTo?: HTMLElement | string;
    routes?: RouteRecordRaw[];
    initialRoute?: string;
    extraPlugins?: Plugin[];
}

export async function mountWithGlobals(
    component: Component,
    options: MountWithGlobalsOpts = {},
): Promise<VueWrapper> {
    const { routes, initialRoute, extraPlugins = [], ...mountOptions } = options;
    const router = createTestRouter(routes);
    // createMemoryHistory starts at START_LOCATION; we must push an initial
    // route so `router.isReady()` resolves. Defaults to '/'.
    await router.push(initialRoute ?? '/');
    await router.isReady();

    // PrimeVue install — required so components reading `$primevue.config`
    // (notably PV Tabs/TabList for aria labels) don't blow up on mount.
    const primeVuePlugin: [Plugin, Record<string, unknown>] = [
        PrimeVue,
        { theme: { preset: ErpPreset } },
    ];

    return mount(component, {
        ...mountOptions,
        global: {
            plugins: [i18n as Plugin, router as Plugin, primeVuePlugin, ...extraPlugins],
        },
    });
}
