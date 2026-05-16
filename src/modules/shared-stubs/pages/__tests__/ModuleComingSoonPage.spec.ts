import { describe, expect, it } from 'vitest';
import type { RouteRecordRaw } from 'vue-router';

import ModuleComingSoonPage from '@/modules/shared-stubs/pages/ModuleComingSoonPage.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

const STUB = { template: '<div />' };

const ROUTES_WITH_MODULE: RouteRecordRaw[] = [
    {
        path: '/accounting',
        name: 'accounting',
        component: ModuleComingSoonPage,
        meta: { breadcrumb: 'Accounting', moduleLabel: 'Accounting' },
    },
    {
        path: '/hrm',
        name: 'hrm',
        component: ModuleComingSoonPage,
        meta: { breadcrumb: 'HRM', moduleLabel: 'HRM' },
    },
    { path: '/', name: 'home', component: STUB },
];

describe('ModuleComingSoonPage', () => {
    it('renders the module label from route.meta.moduleLabel in the header', async () => {
        const w = await mountWithGlobals(ModuleComingSoonPage, {
            routes: ROUTES_WITH_MODULE,
            initialRoute: '/accounting',
        });
        const h1 = w.find('h1');
        expect(h1.exists()).toBe(true);
        expect(h1.text()).toBe('Accounting');
    });

    it('renders the module label inside the card description via i18n interpolation', async () => {
        const w = await mountWithGlobals(ModuleComingSoonPage, {
            routes: ROUTES_WITH_MODULE,
            initialRoute: '/hrm',
        });
        // The cardDescription has `{module}` interpolation — expect "HRM" to
        // appear in the card body, not just the header.
        expect(w.text()).toContain('HRM workflows aren');
    });

    it('renders the "Coming soon" footer', async () => {
        const w = await mountWithGlobals(ModuleComingSoonPage, {
            routes: ROUTES_WITH_MODULE,
            initialRoute: '/accounting',
        });
        expect(w.text()).toContain('Coming soon');
    });

    it('falls back to empty label when moduleLabel meta is missing (defensive)', async () => {
        // The component must not crash if a future route forgets the meta.
        const ROUTES_NO_LABEL: RouteRecordRaw[] = [
            {
                path: '/missing',
                name: 'missing',
                component: ModuleComingSoonPage,
                meta: {},
            },
        ];
        const w = await mountWithGlobals(ModuleComingSoonPage, {
            routes: ROUTES_NO_LABEL,
            initialRoute: '/missing',
        });
        // Page mounts without error; header still renders even with empty title.
        expect(w.find('h1').exists()).toBe(true);
    });
});
