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
    DEPARTMENT_LIST: 'hrm.department.list',
    DEPARTMENT_NEW: 'hrm.department.new',
    DEPARTMENT_DETAIL: 'hrm.department.detail',
    DEPARTMENT_EDIT: 'hrm.department.edit',
    LEAVE_REQUEST_LIST: 'hrm.leaveRequest.list',
    LEAVE_REQUEST_NEW: 'hrm.leaveRequest.new',
    LEAVE_REQUEST_DETAIL: 'hrm.leaveRequest.detail',
    LEAVE_REQUEST_EDIT: 'hrm.leaveRequest.edit',
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
    // ── Departments ─────────────────────────────────────────────────────
    // Same routing shape as Employees — four routes per resource: list,
    // new, detail, edit. The (\\d+) regex on detail/edit prevents
    // /departments/new being shadow-matched as id="new".
    {
        path: 'departments',
        name: HRM_ROUTES.DEPARTMENT_LIST,
        component: () => import('./pages/DepartmentListPage.vue'),
        meta: {
            breadcrumb: 'Departments',
            permission: 'hrm.department.view',
        },
    },
    {
        path: 'departments/new',
        name: HRM_ROUTES.DEPARTMENT_NEW,
        component: () => import('./pages/DepartmentFormPage.vue'),
        meta: {
            breadcrumb: 'New department',
            permission: 'hrm.department.create',
        },
    },
    {
        path: 'departments/:id(\\d+)',
        name: HRM_ROUTES.DEPARTMENT_DETAIL,
        component: () => import('./pages/DepartmentDetailPage.vue'),
        meta: {
            breadcrumb: 'Department',
            permission: 'hrm.department.view',
        },
        props: (route) => ({ id: Number(route.params.id) }),
    },
    {
        path: 'departments/:id(\\d+)/edit',
        name: HRM_ROUTES.DEPARTMENT_EDIT,
        component: () => import('./pages/DepartmentFormPage.vue'),
        meta: {
            breadcrumb: 'Edit department',
            permission: 'hrm.department.update',
        },
        props: (route) => ({ id: Number(route.params.id) }),
    },
    // ── Leave Requests ──────────────────────────────────────────────────
    // Same shape as Employees/Departments. The detail page is the slice's
    // centerpiece — state-machine driven (pending vs decided vs no-perm
    // mode), with approve/reject actions surfaced only in pending mode.
    // The edit route protects against direct-URL edits of decided rows
    // inside the page (the backend's UpdateLeaveRequestAction also blocks
    // — defense in depth, same pattern as the read-side scope on Employee).
    {
        path: 'leave-requests',
        name: HRM_ROUTES.LEAVE_REQUEST_LIST,
        component: () => import('./pages/LeaveRequestListPage.vue'),
        meta: {
            breadcrumb: 'Leave requests',
            permission: 'hrm.leave_request.view',
        },
    },
    {
        path: 'leave-requests/new',
        name: HRM_ROUTES.LEAVE_REQUEST_NEW,
        component: () => import('./pages/LeaveRequestFormPage.vue'),
        meta: {
            breadcrumb: 'New leave request',
            permission: 'hrm.leave_request.create',
        },
    },
    {
        path: 'leave-requests/:id(\\d+)',
        name: HRM_ROUTES.LEAVE_REQUEST_DETAIL,
        component: () => import('./pages/LeaveRequestDetailPage.vue'),
        meta: {
            breadcrumb: 'Leave request',
            permission: 'hrm.leave_request.view',
        },
        props: (route) => ({ id: Number(route.params.id) }),
    },
    {
        path: 'leave-requests/:id(\\d+)/edit',
        name: HRM_ROUTES.LEAVE_REQUEST_EDIT,
        component: () => import('./pages/LeaveRequestFormPage.vue'),
        meta: {
            breadcrumb: 'Edit leave request',
            permission: 'hrm.leave_request.update',
        },
        props: (route) => ({ id: Number(route.params.id) }),
    },
];
