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
    USER_LIST: 'admin.users.list',
    USER_INVITE: 'admin.users.invite',
    USER_DETAIL: 'admin.users.detail',
    USER_EDIT: 'admin.users.edit',
    ROLE_LIST: 'admin.roles.list',
    ROLE_CREATE: 'admin.roles.create',
    ROLE_DETAIL: 'admin.roles.detail',
    ROLE_EDIT: 'admin.roles.edit',
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
    {
        path: 'users',
        name: ADMIN_ROUTES.USER_LIST,
        component: () => import('./pages/UserListPage.vue'),
        meta: {
            // users.view gates the WHOLE /admin/users surface. Missing
            // perm yields 404 at the controller layer (§10.6 feature-
            // hide convention); at the route layer we apply the same
            // permission so the SPA doesn't render the page chrome
            // before the backend rejects it.
            permission: 'users.view',
            breadcrumb: 'admin.users.list.breadcrumb',
        },
    },
    {
        // Invite landed BEFORE the {id} routes so the literal 'invite'
        // segment doesn't get caught by the :id constraint.
        path: 'users/invite',
        name: ADMIN_ROUTES.USER_INVITE,
        component: () => import('./pages/InviteUserForm.vue'),
        meta: {
            permission: 'users.invite',
            breadcrumb: 'admin.users.invite.breadcrumb',
        },
    },
    {
        path: 'users/:id(\\d+)',
        name: ADMIN_ROUTES.USER_DETAIL,
        component: () => import('./pages/UserDetailPage.vue'),
        props: (route) => ({ id: Number(route.params.id) }),
        meta: {
            permission: 'users.view',
            breadcrumb: 'admin.users.detail.breadcrumb',
        },
    },
    {
        path: 'users/:id(\\d+)/edit',
        name: ADMIN_ROUTES.USER_EDIT,
        component: () => import('./pages/EditUserPage.vue'),
        props: (route) => ({ id: Number(route.params.id) }),
        meta: {
            permission: 'users.update',
            breadcrumb: 'admin.users.edit.breadcrumb',
        },
    },
    // ─── Phase 2B — Roles ──────────────────────────────────────────────────
    {
        path: 'roles',
        name: ADMIN_ROUTES.ROLE_LIST,
        component: () => import('./pages/RoleListPage.vue'),
        meta: {
            permission: 'roles.view',
            breadcrumb: 'admin.roles.list.breadcrumb',
        },
    },
    {
        // Create lands BEFORE :id(\\d+) so the literal 'new' segment
        // isn't caught by the digit constraint.
        path: 'roles/new',
        name: ADMIN_ROUTES.ROLE_CREATE,
        component: () => import('./pages/RoleFormPage.vue'),
        meta: {
            permission: 'roles.create',
            breadcrumb: 'admin.roles.create.breadcrumb',
        },
    },
    {
        path: 'roles/:id(\\d+)',
        name: ADMIN_ROUTES.ROLE_DETAIL,
        component: () => import('./pages/RoleDetailPage.vue'),
        props: (route) => ({ id: Number(route.params.id) }),
        meta: {
            permission: 'roles.view',
            breadcrumb: 'admin.roles.detail.breadcrumb',
        },
    },
    {
        path: 'roles/:id(\\d+)/edit',
        name: ADMIN_ROUTES.ROLE_EDIT,
        component: () => import('./pages/RoleFormPage.vue'),
        props: (route) => ({ id: Number(route.params.id) }),
        meta: {
            permission: 'roles.update',
            breadcrumb: 'admin.roles.edit.breadcrumb',
        },
    },
];
