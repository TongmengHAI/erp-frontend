import type { RouteRecordRaw } from 'vue-router';

// ─────────────────────────────────────────────────────────────────────────────
// Admin module routes.
//
// ADMIN_ROUTES holds the named-route constants — getDefaultRoute(),
// UserMenu's Admin Settings item, and AdminAppSidebar all reference
// them through here, not as magic strings.
//
// The shell-mounted parent route ('admin' path with AdminAppLayout) is
// declared in router/index.ts; these children spread under it. Each
// inherits requiresAuth + meta.app='admin' from the parent.
//
// v1 has one child (HRM Settings). Stage 2-5 features (Users, Roles,
// Module Entitlement, Branch Admin per docs/admin.md) append here.
// ─────────────────────────────────────────────────────────────────────────────

export const ADMIN_ROUTES = {
    HRM_SETTINGS: 'admin.hrm.settings',
} as const;

export const adminRoutes: RouteRecordRaw[] = [
    {
        path: 'hrm/settings',
        name: ADMIN_ROUTES.HRM_SETTINGS,
        component: () => import('./pages/HrmSettingsPage.vue'),
        meta: {
            // Route-level permission gate. The route guard reads
            // meta.permission and emits 403 for users who don't have it.
            permission: 'settings.hrm.view',
            // Within-app breadcrumb. Per the locked decision, there is
            // no "Apps › Admin ›" prefix; this is the first crumb of
            // the trail inside the admin app.
            breadcrumb: 'admin.settings.hrm.breadcrumb',
        },
    },
];
