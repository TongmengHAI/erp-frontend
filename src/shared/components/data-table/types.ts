// ─────────────────────────────────────────────────────────────────────────────
// DataTable types — value-free declarations consumed by DataTable.vue and
// page-level domain code.
//
// Master plan decisions actualized here:
//   #20 — status severity is `(row: T) => Severity`, never a field path.
//   #21 — pagination mode is explicit (`mode: 'client' | 'server'`), never
//          inferred from the presence of `total`.
//   #22 — money columns require `currency`; never falls back to a row field.
//   #24 — column `field` is a dot-notation string; DataTable.vue handles
//          undefined-resolution dev warnings.
// ─────────────────────────────────────────────────────────────────────────────

import type { StatusSeverity } from '@/shared/components/data-display/StatusBadge.vue';
import type { DateFormat } from '@/shared/utils/date';

export type ColumnType = 'text' | 'numeric' | 'date' | 'money' | 'status' | 'custom';

export interface DataTableColumn<T = Record<string, unknown>> {
    /**
     * Dot-notation path resolved against each row, e.g. `'tenant.name'`.
     * For `type: 'custom'`, the field still serves as the slot key
     * (`cell-{field}`) and as the column's stable identity.
     */
    field: string;
    /** Header label; i18n key acceptable (renderer wraps with $t). */
    label: string;
    type: ColumnType;
    /** Default `false`. PV draws the sort indicator and toggles internally. */
    sortable?: boolean;
    /**
     * Cell alignment. Defaults derived from type:
     *   numeric, money → 'right'
     *   status         → 'center'
     *   everything else → 'left'
     */
    align?: 'left' | 'center' | 'right';
    /** CSS width (e.g. `'120px'`, `'20%'`). */
    width?: string;

    /** `type: 'date'` — defaults to `'short'` when omitted. */
    dateFormat?: DateFormat;

    /**
     * `type: 'money'` — required (decision #22). Either a fixed code
     * (`'USD'`) or a per-row resolver (e.g. tenant base currency).
     */
    currency?: string | ((row: T) => string);

    /**
     * `type: 'status'` — required (decision #20). Maps each row to one of
     * StatusBadge's 5 severities.
     */
    severity?: (row: T) => StatusSeverity;
}

export interface RowAction<T = Record<string, unknown>> {
    /** Stable id for v-for keying and DOM data-testid. */
    key: string;
    /** Menu item label; i18n key acceptable. */
    label: string;
    /** PrimeIcons class for the menu item leading icon. */
    icon?: string;
    /**
     * `'danger'` renders the menu item in the danger color (destructive
     * ops). Default `'default'`.
     */
    severity?: 'default' | 'danger';
    /**
     * Per-row visibility predicate. Omitted = always visible. Use this for
     * conditional actions like "Reverse" being visible only when
     * `row.status === 'posted'`.
     */
    visible?: (row: T) => boolean;
    onClick: (row: T) => void;
}

export interface DataTableSort {
    field: string;
    order: 'asc' | 'desc';
}

export interface DataTablePagination {
    /** 1-indexed page number. */
    page: number;
    pageSize: number;
}

export interface DataTableEmptyOverride {
    icon?: string;
    title?: string;
    description?: string;
}
