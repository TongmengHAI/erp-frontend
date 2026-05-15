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
     * Single permission key required to see this module. Omitted means the
     * module is visible to all authenticated users (used by Dashboard).
     */
    permission?: string;
    /**
     * Optional nested items. Not rendered by F2c — present for forward-compat
     * when a domain grows sub-modules.
     */
    children?: SidebarModule[];
}
