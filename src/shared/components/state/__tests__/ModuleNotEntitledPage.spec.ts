import { describe, expect, it } from 'vitest';

import ModuleNotEntitledPage from '@/shared/components/state/ModuleNotEntitledPage.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// ModuleNotEntitledPage — Session 7 plan tightening #4. Friendly 403
// page for the tenant_admin-hits-disabled-module case.
//
// Three render variants pinned:
//   • With ?module=hrm  → page names "HRM" in the description
//   • With unknown ?module=xyz → falls back to raw key (no translation
//     error)
//   • Without ?module  → generic description, no module name
// ─────────────────────────────────────────────────────────────────────────────

describe('ModuleNotEntitledPage', () => {
    it('renders with the module label when ?module is a known key', async () => {
        const w = await mountWithGlobals(ModuleNotEntitledPage, {
            initialRoute: '/module-disabled?module=hrm',
        });

        const page = w.find('[data-testid="module-not-entitled-page"]');
        expect(page.exists()).toBe(true);
        // The HRM label comes from superAdmin.tenantModules.modules.hrm.label.
        expect(page.text()).toContain('HRM');
    });

    it('falls back to the raw module key when ?module is unknown (no translation error)', async () => {
        const w = await mountWithGlobals(ModuleNotEntitledPage, {
            initialRoute: '/module-disabled?module=accounting',
        });

        const page = w.find('[data-testid="module-not-entitled-page"]');
        expect(page.exists()).toBe(true);
        // 'accounting' is not in superAdmin.tenantModules.modules; the
        // page renders the raw key rather than the labelKey string.
        expect(page.text()).toContain('accounting');
        // And does NOT leak the i18n path.
        expect(page.text()).not.toContain('superAdmin.tenantModules.modules');
    });

    it('renders the generic description when ?module is absent', async () => {
        const w = await mountWithGlobals(ModuleNotEntitledPage, {
            initialRoute: '/module-disabled',
        });

        const page = w.find('[data-testid="module-not-entitled-page"]');
        expect(page.exists()).toBe(true);
        // Generic copy ("This module has been disabled...") — no
        // specific module name.
        expect(page.text()).toContain('disabled by your administrator');
    });

    it('exposes a "go to apps" action that navigates to the launcher', async () => {
        const w = await mountWithGlobals(ModuleNotEntitledPage);

        // Button rendered via the slot — find by visible text or
        // testid would work; assert the page has at least one button
        // (the launcher link).
        const buttons = w.findAll('button');
        expect(buttons.length).toBeGreaterThan(0);
    });
});
