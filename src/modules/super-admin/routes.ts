import type { RouteRecordRaw } from 'vue-router';

// ─────────────────────────────────────────────────────────────────────────────
// Super Admin module routes (Session 5 of the SA Portal slice).
//
// SUPER_ADMIN_ROUTES holds the named-route constants — getDefaultRoute,
// UserMenu's Super Admin link (Session 5 if shipped), and the
// SuperAdminAppSidebar all reference them through here, not as magic
// strings.
//
// The shell-mounted parent route ('super-admin' path with
// SuperAdminAppLayout + meta.requiresSuperAdmin) is declared in
// router/index.ts; these children spread under it. Each inherits the
// requiresAuth + requiresSuperAdmin gate from the parent.
//
// v1 ships two children — Dashboard (placeholder; real page lands in
// Session 7) and Tenants list (placeholder; real page lands in
// Session 6).
// ─────────────────────────────────────────────────────────────────────────────

export const SUPER_ADMIN_ROUTES = {
    DASHBOARD: 'super-admin.dashboard',
    TENANT_LIST: 'super-admin.tenants.list',
} as const;

export const superAdminRoutes: RouteRecordRaw[] = [
    {
        path: '',
        name: SUPER_ADMIN_ROUTES.DASHBOARD,
        component: () =>
            import('./pages/SuperAdminDashboardPlaceholderPage.vue'),
        meta: {},
    },
    {
        path: 'tenants',
        name: SUPER_ADMIN_ROUTES.TENANT_LIST,
        component: () => import('./pages/TenantListPlaceholderPage.vue'),
        meta: {
            breadcrumb: 'superAdmin.tenants.breadcrumb.list',
        },
    },
];
