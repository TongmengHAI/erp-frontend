import type { RouteRecordRaw } from 'vue-router';

// ─────────────────────────────────────────────────────────────────────────────
// HRM module routes.
//
// HRM_ROUTES holds the named-route constants so guards, redirects, and
// other modules reference routes without magic strings. Pages are
// lazy-loaded (route-level code splitting per CLAUDE.md §7.J).
//
// The shell-mounted parent route is still in router/index.ts under the
// AppShellLayout (path: 'hrm'). These child routes mount UNDER that
// path, so the full paths are /hrm/employees, /hrm/employees/new, etc.
// The /hrm route itself currently still renders the ModuleComingSoonPage
// — when this slice ships, the consumer of these routes (router/index.ts)
// reorganises that record to nest the children below.
// ─────────────────────────────────────────────────────────────────────────────

export const HRM_ROUTES = {
    EMPLOYEE_LIST: 'hrm.employee.list',
    EMPLOYEE_NEW: 'hrm.employee.new',
    EMPLOYEE_DETAIL: 'hrm.employee.detail',
    EMPLOYEE_EDIT: 'hrm.employee.edit',
} as const;

/**
 * Children of the AppShellLayout's `hrm` route. router/index.ts spreads
 * these into the shell tree. Each route inherits requiresAuth from the
 * shell parent via Vue Router's meta merge.
 *
 * Lazy-loaded page targets land in Day 4 (list, detail) and Day 5 (form).
 * Until those exist, the routes here are kept ready for wiring — the
 * router consumer will switch the shell's `hrm` record to nest these
 * once the page files land.
 */
export const hrmRoutes: RouteRecordRaw[] = [
    {
        path: 'employees',
        name: HRM_ROUTES.EMPLOYEE_LIST,
        component: () => import('./pages/EmployeeListPage.vue'),
        meta: {
            breadcrumb: 'Employees',
            permission: 'hrm.employee.view',
        },
    },
    {
        path: 'employees/new',
        name: HRM_ROUTES.EMPLOYEE_NEW,
        component: () => import('./pages/EmployeeFormPage.vue'),
        // mode=create — the page reads route.name to switch between
        // create and edit. Avoids a stringly-typed prop or a separate
        // page component.
        meta: {
            breadcrumb: 'New employee',
            permission: 'hrm.employee.create',
        },
    },
    {
        path: 'employees/:id(\\d+)',
        name: HRM_ROUTES.EMPLOYEE_DETAIL,
        component: () => import('./pages/EmployeeDetailPage.vue'),
        // Numeric route param — the (\\d+) regex prevents
        // /hrm/employees/new being matched here instead.
        meta: {
            // Dynamic breadcrumb — Breadcrumbs.vue invokes the function
            // with the current route. Falls back to "Employee" if the
            // detail query hasn't yet populated the cache.
            breadcrumb: 'Employee',
            permission: 'hrm.employee.view',
        },
        props: (route) => ({ id: Number(route.params.id) }),
    },
    {
        path: 'employees/:id(\\d+)/edit',
        name: HRM_ROUTES.EMPLOYEE_EDIT,
        component: () => import('./pages/EmployeeFormPage.vue'),
        meta: {
            breadcrumb: 'Edit employee',
            permission: 'hrm.employee.update',
        },
        props: (route) => ({ id: Number(route.params.id) }),
    },
];
