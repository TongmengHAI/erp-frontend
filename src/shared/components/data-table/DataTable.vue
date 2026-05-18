<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import PrimeDataTable, {
    type DataTablePageEvent,
    type DataTableSortEvent,
} from 'primevue/datatable';
import Column from 'primevue/column';
import Menu from 'primevue/menu';
import type { MenuItem } from 'primevue/menuitem';

import DateDisplay from '@/shared/components/data-display/DateDisplay.vue';
import MoneyDisplay from '@/shared/components/data-display/MoneyDisplay.vue';
import StatusBadge from '@/shared/components/data-display/StatusBadge.vue';
import EmptyState from '@/shared/components/state/EmptyState.vue';
import ErrorState from '@/shared/components/state/ErrorState.vue';
import LoadingState from '@/shared/components/state/LoadingState.vue';
import { resolveFieldPath, warnUnresolvedField } from './fieldPath';
import type {
    DataTableColumn,
    DataTableEmptyOverride,
    DataTableSort,
    RowAction,
} from './types';

/**
 * DataTable — config-driven wrapper around PrimeVue DataTable.
 *
 * - Column type → cell renderer (text, numeric, date, money, status, custom).
 * - Pagination mode is explicit (`mode: 'client' | 'server'`, decision #21).
 *   Mode is set at mount time; switching mid-mount is unsupported — remount
 *   via `:key` instead.
 * - Loading: header stays visible, body swaps to LoadingState skeleton.
 * - Error: ErrorState replaces the entire region; emits `retry`.
 * - Empty: EmptyState renders in PV's `#empty` slot when data is exhausted.
 * - Row actions: kebab menu in a trailing column when `rowActions` provided.
 * - Bulk actions: scoped slot rendered in a sticky bar above the header when
 *   `selectable && selected.length > 0`.
 *
 * Sticky-header z-index stack:
 *   bulk-actions bar (z-20) > sticky <thead> (z-10) > rows (default).
 */
interface Props<R> {
    data: R[];
    columns: DataTableColumn<R>[];

    loading?: boolean;
    error?: Error | string | null;
    empty?: DataTableEmptyOverride;

    mode: 'client' | 'server';
    pageSize?: number;
    page?: number;
    total?: number;

    sort?: DataTableSort | null;

    selectable?: boolean;
    selected?: R[];

    density?: 'comfortable' | 'compact';

    rowActions?: RowAction<R>[];

    stickyHeader?: boolean;
    rowKey?: string;
}

const props = withDefaults(defineProps<Props<T>>(), {
    loading: false,
    error: null,
    empty: undefined,
    pageSize: 25,
    page: 1,
    total: undefined,
    sort: null,
    selectable: false,
    selected: () => [] as never[],
    density: 'comfortable',
    rowActions: undefined,
    stickyHeader: true,
    rowKey: 'id',
});

const emit = defineEmits<{
    'update:page': [page: number];
    'update:pageSize': [pageSize: number];
    'update:sort': [sort: DataTableSort | null];
    'update:selected': [rows: T[]];
    'row-click': [row: T, event: Event];
    retry: [];
}>();

const { t } = useI18n();

// ─── Dev-mode field-path validation ─────────────────────────────────────────
// Warn once per problematic column when data is non-empty. Re-runs when the
// column config changes (e.g. dynamic columns).
function runFieldPathWarnings(): void {
    for (const col of props.columns) {
        warnUnresolvedField(props.data, col);
    }
    if (import.meta.env.DEV) {
        for (const col of props.columns) {
            if (col.type === 'money' && col.currency == null) {
                console.warn(
                    `[DataTable] money column "${col.label}" is missing 'currency' (required by decision #22).`,
                );
            }
            if (col.type === 'status' && col.severity == null) {
                console.warn(
                    `[DataTable] status column "${col.label}" is missing 'severity' resolver (required by decision #20).`,
                );
            }
        }
        if (props.mode === 'server' && props.total == null) {
            console.warn(
                `[DataTable] mode='server' but 'total' is undefined — paginator will use data.length as a fallback.`,
            );
        }
    }
}
onMounted(runFieldPathWarnings);
watch(
    () => props.columns,
    () => runFieldPathWarnings(),
);

// ─── Selection: forward v-model:selected to PV's :selection ─────────────────
const pvSelection = computed<T[]>({
    get: () => props.selected,
    set: (next: T[]) => emit('update:selected', next),
});

// ─── Sort: translate between our DataTableSort and PV's split props ─────────
const pvSortField = computed(() => props.sort?.field ?? undefined);
const pvSortOrder = computed(() => {
    if (!props.sort) return undefined;
    return props.sort.order === 'asc' ? 1 : -1;
});

function onPvSort(event: DataTableSortEvent): void {
    if (event.sortField == null || event.sortOrder == null || event.sortOrder === 0) {
        emit('update:sort', null);
        return;
    }
    emit('update:sort', {
        field: String(event.sortField),
        order: event.sortOrder === 1 ? 'asc' : 'desc',
    });
}

// ─── Pagination: PV uses zero-indexed `first`, we use 1-indexed `page` ──────
const pvFirst = computed(() => (props.page - 1) * props.pageSize);

function onPvPage(event: DataTablePageEvent): void {
    // event.page is 0-indexed, event.rows is the current pageSize.
    const newPage = event.page + 1;
    if (newPage !== props.page) emit('update:page', newPage);
    if (event.rows !== props.pageSize) emit('update:pageSize', event.rows);
}

// ─── Cell helpers ───────────────────────────────────────────────────────────
function resolveCurrency(row: T, col: DataTableColumn<T>): string {
    if (typeof col.currency === 'function') return col.currency(row);
    return col.currency ?? '';
}

function alignClass(col: DataTableColumn<T>): string {
    const align =
        col.align ??
        (col.type === 'numeric' || col.type === 'money'
            ? 'right'
            : col.type === 'status'
              ? 'center'
              : 'left');
    return align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
}

// ─── Row actions kebab menu ─────────────────────────────────────────────────
const rowActionsMenu = ref<InstanceType<typeof Menu> | null>(null);
const rowActionsTarget = ref<T | null>(null);

function openRowActions(event: Event, row: T): void {
    rowActionsTarget.value = row;
    rowActionsMenu.value?.show(event);
}

const rowActionsMenuItems = computed<MenuItem[]>(() => {
    const row = rowActionsTarget.value;
    if (!row || !props.rowActions) return [];
    return props.rowActions
        .filter((a) => !a.visible || a.visible(row))
        .map((a) => ({
            // Translate the label — matches the column-header behavior at
            // the bottom of this template (`:header="t(col.label)"`). The
            // RowAction.label JSDoc has always said "i18n key acceptable";
            // this is the implementation catching up. Passing a literal
            // English label still works — t() of an unknown key returns
            // the key itself.
            label: t(a.label),
            icon: a.icon,
            class: a.severity === 'danger' ? 'data-table__action--danger' : '',
            command: () => a.onClick(row),
        }));
});

// ─── Row click forwarding ───────────────────────────────────────────────────
function onPvRowClick(event: { originalEvent: Event; data: T }): void {
    emit('row-click', event.data, event.originalEvent);
}

// ─── PV PT for sticky header + density ──────────────────────────────────────
const pvSize = computed<'small' | 'normal'>(() =>
    props.density === 'compact' ? 'small' : 'normal',
);

const stickyHeaderPT = computed(() =>
    props.stickyHeader
        ? { thead: { style: 'position: sticky; top: 0; z-index: 10;' } }
        : {},
);

// ─── Bulk actions visibility ────────────────────────────────────────────────
const showBulkBar = computed(
    () => props.selectable && pvSelection.value.length > 0,
);
</script>

<template>
    <div class="data-table" :data-density="density">
        <!-- Error state replaces the entire DataTable region. -->
        <ErrorState
            v-if="error"
            :title="t('dataTable.error.title')"
            :description="
                typeof error === 'string' ? error : t('dataTable.error.description')
            "
            @retry="emit('retry')"
        />

        <template v-else>
            <!-- Bulk actions sticky bar (z-20 — above the sticky header). -->
            <div
                v-if="showBulkBar"
                class="data-table__bulk-bar sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border-default bg-brand-bg-subtle px-4 py-2 text-sm text-text-primary"
                data-testid="data-table-bulk-bar"
            >
                <span class="font-medium">
                    {{ t('dataTable.selectedCount', { n: pvSelection.length }) }}
                </span>
                <div class="flex items-center gap-2">
                    <slot
                        name="bulk-actions"
                        :selected-rows="pvSelection"
                    />
                </div>
            </div>

            <PrimeDataTable
                :value="loading ? [] : data"
                :data-key="rowKey"
                :paginator="true"
                :rows="pageSize"
                :first="pvFirst"
                :rows-per-page-options="[10, 25, 50, 100]"
                :lazy="mode === 'server'"
                :total-records="mode === 'server' ? (total ?? data.length) : undefined"
                :sort-field="pvSortField"
                :sort-order="pvSortOrder"
                :removable-sort="true"
                :selection="selectable ? pvSelection : undefined"
                :selection-mode="undefined"
                :size="pvSize"
                :pt="stickyHeaderPT"
                @update:selection="(v) => emit('update:selected', (v as T[]) ?? [])"
                @sort="onPvSort"
                @page="onPvPage"
                @row-click="onPvRowClick"
            >
                <!-- Selection checkbox column. PV adds the header checkbox
                     when selectionMode='multiple' AND a Column with
                     selectionMode='multiple' is declared. -->
                <Column
                    v-if="selectable"
                    selection-mode="multiple"
                    header-style="width: 3rem"
                />

                <!-- Data columns. -->
                <Column
                    v-for="col in columns"
                    :key="col.field"
                    :field="col.field"
                    :header="t(col.label)"
                    :sortable="col.sortable ?? false"
                    :style="col.width ? `width: ${col.width}` : undefined"
                    :header-class="alignClass(col)"
                    :body-class="alignClass(col)"
                >
                    <template #body="{ data: row }">
                        <!-- text / numeric -->
                        <span
                            v-if="col.type === 'text' || col.type === 'numeric'"
                            :class="col.type === 'numeric' ? 'tabular-nums' : ''"
                        >
                            {{ resolveFieldPath(row, col.field) ?? '' }}
                        </span>

                        <!-- date -->
                        <DateDisplay
                            v-else-if="col.type === 'date'"
                            :date="(resolveFieldPath(row, col.field) as string | Date)"
                            :format="col.dateFormat ?? 'short'"
                        />

                        <!-- money -->
                        <MoneyDisplay
                            v-else-if="col.type === 'money'"
                            :amount="String(resolveFieldPath(row, col.field) ?? '0.0000')"
                            :currency="resolveCurrency(row, col)"
                        />

                        <!-- status -->
                        <StatusBadge
                            v-else-if="col.type === 'status'"
                            :severity="col.severity ? col.severity(row) : 'neutral'"
                            :label="String(resolveFieldPath(row, col.field) ?? '')"
                        />

                        <!-- custom -->
                        <slot
                            v-else-if="col.type === 'custom'"
                            :name="`cell-${col.field}`"
                            :row="row"
                            :value="resolveFieldPath(row, col.field)"
                        >
                            <!-- Fallback when no slot supplied: text. -->
                            <span>{{ resolveFieldPath(row, col.field) ?? '' }}</span>
                        </slot>
                    </template>
                </Column>

                <!-- Row actions kebab column. -->
                <Column
                    v-if="rowActions && rowActions.length > 0"
                    header-style="width: 3rem"
                    body-class="text-right"
                >
                    <template #body="{ data: row }">
                        <button
                            type="button"
                            class="rounded-md p-1 text-text-secondary hover:bg-surface-sunken hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                            :aria-label="t('dataTable.rowActions')"
                            data-testid="data-table-row-kebab"
                            @click.stop="openRowActions($event, row as T)"
                        >
                            <i class="pi pi-ellipsis-v" aria-hidden="true"></i>
                        </button>
                    </template>
                </Column>

                <!-- Empty/loading body swap: when loading we pass [] to PV
                     and surface our LoadingState here; when truly empty we
                     surface EmptyState. -->
                <template #empty>
                    <LoadingState
                        v-if="loading"
                        variant="list"
                        :rows="pageSize ?? 5"
                    />
                    <EmptyState
                        v-else
                        :icon="empty?.icon ?? 'pi pi-inbox'"
                        :title="empty?.title ?? t('dataTable.empty.title')"
                        :description="empty?.description ?? t('dataTable.empty.description')"
                    />
                </template>
            </PrimeDataTable>

            <!-- Singleton kebab menu (popup). PV teleports the panel. -->
            <Menu
                v-if="rowActions && rowActions.length > 0"
                ref="rowActionsMenu"
                :model="rowActionsMenuItems"
                :popup="true"
                data-testid="data-table-row-menu"
            />
        </template>
    </div>
</template>

<style scoped>
:deep(.data-table__action--danger) {
    color: var(--color-danger);
}
</style>
