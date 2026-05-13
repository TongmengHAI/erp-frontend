import type { RouteLocationRaw } from 'vue-router';

// ─────────────────────────────────────────────────────────────────────────────
// Navigation types — shared across PageHeader (F2a) and Breadcrumbs (F2c).
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
