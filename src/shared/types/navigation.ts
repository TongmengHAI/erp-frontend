import type { RouteLocationRaw } from 'vue-router';

// ─────────────────────────────────────────────────────────────────────────────
// Navigation types — shared across PageHeader (F2a), Breadcrumbs (F2c), and
// AppSidebar (F2c).
// ─────────────────────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
    /** Display label. */
    label: string;
    /**
     * Optional vue-router target. Items without `to` render as plain text
     * (typically the current page at the end of the trail).
     */
    to?: RouteLocationRaw;
}

export interface SidebarModule {
    /**
     * i18n key (e.g. 'navigation.modules.accounting') or literal string.
     * The renderer wraps the value in $t() unconditionally; literal strings
     * just pass through.
     */
    label: string;
    /** PrimeIcons class, e.g. 'pi pi-book'. */
    icon: string;
    /** vue-router named route. */
    routeName: string;
    /**
     * Exact-match permission key. The module renders only if the user has
     * this specific permission. Use for fine-grained gates where the
     * module shouldn't appear unless a specific capability exists.
     */
    permission?: string;
    /**
     * Prefix-match permission gate. The module renders if the user has
     * ANY permission whose name equals `permissionPrefix` exactly or
     * starts with `${permissionPrefix}.`.
     *
     * Use this for module-visibility gates where "can see Accounting in
     * the sidebar" is semantically different from "can perform
     * accounting.X.Y action". A user with `accounting.journal_entry.view`
     * sees the Accounting nav item via `permissionPrefix: 'accounting'`.
     *
     * If both `permission` and `permissionPrefix` are set, the module
     * appears when EITHER matches (OR, not AND).
     *
     * Omitted (both fields) = module is visible to all authenticated
     * users (used by Dashboard).
     */
    permissionPrefix?: string;
    /**
     * Optional nested items. Not rendered by F2c — present for forward-compat
     * when a domain grows sub-modules.
     */
    children?: SidebarModule[];
}
