import { describe, expect, it } from 'vitest';

import { accessibleApps } from '@/shared/launcher/accessibleApps';

// ─────────────────────────────────────────────────────────────────────────────
// accessibleApps — single source of truth for "which apps does the
// user see in the launcher + switcher surfaces?"
//
// Two consumers (LauncherPage + AppSwitcherDropdown) route through
// this helper — the belt-and-suspenders pattern per §10.6 means a
// regression here surfaces on BOTH surfaces simultaneously.
//
// Filter dimensions exercised:
//   • hiddenFromLauncher — Admin is hidden everywhere in launcher/
//     switcher (reached via the user menu instead).
//   • superAdminOnly — Super Admin Portal visible ONLY to SA users.
//   • entitlementGated + entitled_modules — HRM hidden when the
//     tenant lacks entitlement.
//   • permissionPrefix — HRM hidden when the user has no hrm.* perms.
//
// Session 5 lock: SA's view shows ONLY the Super Admin card; tenant
// user's view shows ONLY their entitled modules (entry by entry).
// ─────────────────────────────────────────────────────────────────────────────

describe('accessibleApps', () => {
    it('SA sees ONLY the Super Admin card (superAdminOnly filter)', () => {
        const result = accessibleApps({
            isSuperAdmin: true,
            entitledModules: [], // SA always has [] by design
            permissions: [],
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('super-admin');
    });

    it('SA does NOT see HRM even if the input somehow included hrm in entitledModules', () => {
        // Defensive: SA has [] entitled_modules by design from the
        // backend. But the filter logic must not surface tenant
        // modules to SA via this list — SA reaches tenant data via
        // /super-admin/tenants/{id}, not via the launcher.
        const result = accessibleApps({
            isSuperAdmin: true,
            entitledModules: ['hrm'],
            permissions: ['hrm.employee.view'],
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('super-admin');
    });

    it('tenant_user with HRM entitlement + hrm.* perms sees ONLY the HRM card', () => {
        const result = accessibleApps({
            isSuperAdmin: false,
            entitledModules: ['hrm'],
            permissions: ['hrm.employee.view'],
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('hrm');
    });

    it('tenant_user does NOT see the Super Admin card (superAdminOnly filter)', () => {
        const result = accessibleApps({
            isSuperAdmin: false,
            entitledModules: ['hrm'],
            permissions: ['hrm.employee.view'],
        });

        const ids = result.map((a) => a.id);
        expect(ids).not.toContain('super-admin');
    });

    it('tenant_user with HRM entitlement but NO hrm.* perms sees no apps (permission gate)', () => {
        const result = accessibleApps({
            isSuperAdmin: false,
            entitledModules: ['hrm'],
            permissions: [],
        });

        expect(result).toHaveLength(0);
    });

    it('tenant_user without HRM entitlement sees no apps (entitlement gate)', () => {
        const result = accessibleApps({
            isSuperAdmin: false,
            entitledModules: [],
            permissions: ['hrm.employee.view'],
        });

        expect(result).toHaveLength(0);
    });

    it('Admin is never in the launcher list (hiddenFromLauncher), even for users with settings.* perms', () => {
        const result = accessibleApps({
            isSuperAdmin: false,
            entitledModules: ['hrm'],
            permissions: ['hrm.employee.view', 'settings.hrm.view'],
        });

        const ids = result.map((a) => a.id);
        expect(ids).not.toContain('admin');
        // HRM still visible — admin is just hidden from this surface.
        expect(ids).toContain('hrm');
    });
});
