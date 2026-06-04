import type { RouteRecordRaw } from 'vue-router';

// ─────────────────────────────────────────────────────────────────────────────
// Super Admin module routes.
//
// SUPER_ADMIN_ROUTES holds the named-route constants — getDefaultRoute,
// the user menu's Super Admin link, the SuperAdminAppSidebar, and the
// internal RouterLink usages all reference them through here.
//
// The shell-mounted parent route ('super-admin' path with
// SuperAdminAppLayout + meta.requiresSuperAdmin) is declared in
// router/index.ts; these children spread under it. Each inherits the
// requiresAuth + requiresSuperAdmin gate from the parent.
//
// v1 ships:
//   • Dashboard (placeholder; real page lands in Session 7)
//   • Tenants list / detail / new / edit (Session 6 — real pages)
// ─────────────────────────────────────────────────────────────────────────────

export const SUPER_ADMIN_ROUTES = {
    DASHBOARD: 'super-admin.dashboard',
    TENANT_LIST: 'super-admin.tenants.list',
    TENANT_NEW: 'super-admin.tenants.new',
    TENANT_DETAIL: 'super-admin.tenants.detail',
    TENANT_EDIT: 'super-admin.tenants.edit',
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
        component: () => import('./pages/TenantListPage.vue'),
        meta: {
            breadcrumb: 'superAdmin.tenants.breadcrumb.list',
        },
    },
    {
        path: 'tenants/new',
        name: SUPER_ADMIN_ROUTES.TENANT_NEW,
        component: () => import('./pages/TenantFormPage.vue'),
        meta: {
            breadcrumb: 'superAdmin.tenants.breadcrumb.new',
        },
    },
    {
        path: 'tenants/:id',
        name: SUPER_ADMIN_ROUTES.TENANT_DETAIL,
        component: () => import('./pages/TenantDetailPage.vue'),
        props: (route) => ({ id: Number(route.params.id) }),
    },
    {
        path: 'tenants/:id/edit',
        name: SUPER_ADMIN_ROUTES.TENANT_EDIT,
        component: () => import('./pages/TenantFormPage.vue'),
        props: (route) => ({ id: Number(route.params.id) }),
        meta: {
            breadcrumb: 'superAdmin.tenants.breadcrumb.edit',
        },
    },
];
