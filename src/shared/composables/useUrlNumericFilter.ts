import { computed, type ComputedRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// ─────────────────────────────────────────────────────────────────────────────
// useUrlNumericFilter — URL→numeric filter state with a clear() affordance.
//
// The shape was inlined in EmployeeListPage for ?department_id= before
// being extracted; both department_id and (in a future slice) position_id
// share the same pattern:
//
//   - read ?{key}= from the URL, coerce to number | null
//   - returns null for absent / non-numeric / non-positive values
//   - clear() removes the key from the URL via router.replace
//     (NOT push — chip-clear shouldn't add a back-button entry)
//
// Use with FilterChip for the visible affordance. Each filter that
// deep-links into a list page from a parent detail page (e.g.
// /hrm/employees?department_id=3 from DepartmentDetailPage) consumes
// this composable.
//
// Numeric-only by design — the load-bearing cases in the HRM module
// (department_id, position_id, employee_id) are all integer FKs.
// Adding string-filter support later is straightforward but
// premature now.
// ─────────────────────────────────────────────────────────────────────────────

export interface UrlNumericFilterResult {
    /**
     * The current filter value parsed from the URL query string.
     * `null` when the key is absent, not a number, or not a positive
     * integer. Reactive — re-derives on every route change.
     */
    value: ComputedRef<number | null>;
    /**
     * Write the value into the URL via router.replace. Pass null to
     * remove the key (same as clear()). Returns the navigation Promise
     * so tests can await; page-side handlers can fire-and-forget via
     * `void set(...)`.
     *
     * Added for the admin Settings company picker — bidirectional URL
     * sync (Select control writes; URL drives the query). Same shape
     * as useUrlEnumFilter's `set`.
     */
    set: (next: number | null) => Promise<void>;
    /**
     * Remove the key from the URL via router.replace. Other query
     * params survive untouched. Safe to call when the key isn't
     * currently set (no-op write to the same URL).
     *
     * Returns the navigation Promise so callers that need to wait for
     * the route change (typically tests, occasionally code that
     * triggers a refetch immediately after clearing) can `await`.
     * Page-side click handlers can fire-and-forget — `void clear()`
     * is the common case.
     */
    clear: () => Promise<void>;
}

export function useUrlNumericFilter(key: string): UrlNumericFilterResult {
    const route = useRoute();
    const router = useRouter();

    const value = computed<number | null>(() => {
        const raw = route.query[key];
        if (typeof raw !== 'string') return null;
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? n : null;
    });

    async function set(next: number | null): Promise<void> {
        const newQuery = { ...route.query };
        if (next === null) {
            delete newQuery[key];
        } else {
            newQuery[key] = String(next);
        }
        await router.replace({ query: newQuery });
    }

    async function clear(): Promise<void> {
        await set(null);
    }

    return { value, set, clear };
}
