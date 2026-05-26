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

    async function clear(): Promise<void> {
        // router.replace (not push) — the chip-clear shouldn't add a
        // back-button entry; navigating away and back should land on
        // the unfiltered state, not the filtered-then-cleared state.
        const newQuery = { ...route.query };
        delete newQuery[key];
        await router.replace({ query: newQuery });
    }

    return { value, clear };
}
