import { describe, expect, it } from 'vitest';
import type { RouteRecordRaw } from 'vue-router';

import Breadcrumbs from '@/shared/components/navigation/Breadcrumbs.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

const STUB = { template: '<div />' };

describe('Breadcrumbs', () => {
    it('renders the manual items prop verbatim', async () => {
        const w = await mountWithGlobals(Breadcrumbs, {
            props: {
                items: [
                    { label: 'Home', to: { name: 'home' } },
                    { label: 'Accounting', to: { name: 'home' } },
                    { label: 'Journal Entries' },
                ],
            },
        });
        const text = w.text();
        expect(text).toContain('Home');
        expect(text).toContain('Accounting');
        expect(text).toContain('Journal Entries');
    });

    it('renders the chevron separator between items (n-1 separators for n items)', async () => {
        const w = await mountWithGlobals(Breadcrumbs, {
            props: {
                items: [
                    { label: 'Home', to: { name: 'home' } },
                    { label: 'Accounting', to: { name: 'home' } },
                    { label: 'Journal Entries' },
                ],
            },
        });
        const separators = w.findAll('i.pi-angle-right');
        expect(separators).toHaveLength(2);
    });

    it('final item renders as plain <span>, earlier items render as <RouterLink>', async () => {
        const w = await mountWithGlobals(Breadcrumbs, {
            props: {
                items: [
                    { label: 'Home', to: { name: 'home' } },
                    { label: 'Current Page' },
                ],
            },
        });
        const links = w.findAll('a');
        expect(links).toHaveLength(1);
        expect(links[0].text()).toBe('Home');
        // Final item is not inside an <a>.
        const lastLi = w.findAll('li').at(-1);
        expect(lastLi?.find('a').exists()).toBe(false);
        expect(lastLi?.text()).toContain('Current Page');
    });

    it('auto-derives from route.matched meta.breadcrumb when no items prop is given', async () => {
        const routes: RouteRecordRaw[] = [
            {
                path: '/',
                name: 'home',
                component: STUB,
                meta: { breadcrumb: 'Home' },
            },
            {
                path: '/accounting',
                name: 'accounting-root',
                component: STUB,
                meta: { breadcrumb: 'Accounting' },
                children: [
                    {
                        path: 'journal',
                        name: 'journal-list',
                        component: STUB,
                        meta: { breadcrumb: 'Journal Entries' },
                    },
                ],
            },
        ];
        const w = await mountWithGlobals(Breadcrumbs, {
            routes,
            initialRoute: '/accounting/journal',
        });
        const text = w.text();
        expect(text).toContain('Accounting');
        expect(text).toContain('Journal Entries');
        // Final item should not be a link.
        const lastLi = w.findAll('li').at(-1);
        expect(lastLi?.find('a').exists()).toBe(false);
    });

    it('renders nothing when the trail has fewer than 2 items', async () => {
        const w = await mountWithGlobals(Breadcrumbs, {
            props: { items: [{ label: 'Solo' }] },
        });
        expect(w.find('nav').exists()).toBe(false);
    });
});
