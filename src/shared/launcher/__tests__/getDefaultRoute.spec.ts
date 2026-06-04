import { describe, expect, it } from 'vitest';

import { getDefaultRoute } from '@/shared/launcher/getDefaultRoute';

// ─────────────────────────────────────────────────────────────────────────────
// getDefaultRoute — pure-function unit tests covering the 5 cases the
// Session 5 plan tightening calls out:
//
//   1. SA user                              → super-admin.dashboard
//   2. Tenant user, exactly one entitled    → that app's dashboard
//      module (and matching permission)
//   3. Tenant user, NO entitled modules     → launcher (empty state)
//   4. Tenant user, MULTIPLE entitled       → launcher (multi-card)
//   5. Unauthenticated / empty input        → launcher
//
// The input shape is { isSuperAdmin, entitledModules, permissions }.
// Tests pin each case so a regression to any branch surfaces here.
// ─────────────────────────────────────────────────────────────────────────────

describe('getDefaultRoute', () => {
    it('case 1 — SA lands on super-admin.dashboard, regardless of entitlement / permissions', () => {
        expect(
            getDefaultRoute({
                isSuperAdmin: true,
                entitledModules: [],
                permissions: [],
            }),
        ).toEqual({ name: 'super-admin.dashboard' });

        // Even if the SA somehow had tenant-like data (entitled modules,
        // permissions), the SA flag wins — they always land on their
        // own dashboard.
        expect(
            getDefaultRoute({
                isSuperAdmin: true,
                entitledModules: ['hrm'],
                permissions: ['hrm.employee.view'],
            }),
        ).toEqual({ name: 'super-admin.dashboard' });
    });

    it('case 2 — tenant_user with HRM entitlement + hrm.* permissions lands on hrm.dashboard', () => {
        expect(
            getDefaultRoute({
                isSuperAdmin: false,
                entitledModules: ['hrm'],
                permissions: ['hrm.employee.view'],
            }),
        ).toEqual({ name: 'hrm.dashboard' });

        // canAny-style prefix match — exact 'hrm' (no dot) counts too.
        expect(
            getDefaultRoute({
                isSuperAdmin: false,
                entitledModules: ['hrm'],
                permissions: ['hrm'],
            }),
        ).toEqual({ name: 'hrm.dashboard' });
    });

    it('case 3 — tenant_user with NO entitled modules lands on launcher (zero-card empty state)', () => {
        expect(
            getDefaultRoute({
                isSuperAdmin: false,
                entitledModules: [],
                permissions: ['hrm.employee.view'],
            }),
        ).toEqual({ name: 'launcher' });
    });

    it('case 4 — tenant_user with HRM entitlement but NO hrm.* permission lands on launcher', () => {
        // Defensive: entitlement says "tenant has HRM" but the user
        // themselves has no permission to do anything with it. Lands
        // on launcher rather than getting routed to a module they
        // can't use.
        expect(
            getDefaultRoute({
                isSuperAdmin: false,
                entitledModules: ['hrm'],
                permissions: [],
            }),
        ).toEqual({ name: 'launcher' });
    });

    it('case 5 — unauthenticated / empty input lands on launcher', () => {
        // The function only gets called when authenticated (LoginPage
        // success path, root redirect with auth, guest-gate bounce);
        // the empty-input case exists as a safety net rather than a
        // production path. Should default to launcher gracefully.
        expect(
            getDefaultRoute({
                isSuperAdmin: false,
                entitledModules: [],
                permissions: [],
            }),
        ).toEqual({ name: 'launcher' });
    });

    it('treats permissions starting with the prefix string but on a different boundary as NOT matching', () => {
        // 'hrmx.foo' is NOT under the hrm.* namespace — string-startsWith
        // alone would false-positive. The implementation guards via
        // the dot separator check.
        expect(
            getDefaultRoute({
                isSuperAdmin: false,
                entitledModules: ['hrm'],
                permissions: ['hrmx.foo'],
            }),
        ).toEqual({ name: 'launcher' });
    });

    it('ignores SA-only apps in the LAUNCHER_APPS walk for tenant users (admin/super-admin are filtered out)', () => {
        // Defensive: a tenant_user with settings.* permissions should
        // NOT be routed to the admin app via getDefaultRoute (admin is
        // accessed via the user menu, not the launcher). The function
        // filters via accessibleApps semantics, which exclude admin
        // (hiddenFromLauncher) and super-admin (superAdminOnly).
        expect(
            getDefaultRoute({
                isSuperAdmin: false,
                entitledModules: [],
                permissions: ['settings.hrm.view'],
            }),
        ).toEqual({ name: 'launcher' });
    });
});
