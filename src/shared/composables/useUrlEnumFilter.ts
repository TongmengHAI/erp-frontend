import { computed, type ComputedRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// ─────────────────────────────────────────────────────────────────────────────
// useUrlEnumFilter — URL→enum-string filter state with set() + clear()
// affordances. Sibling of useUrlNumericFilter for filters whose values are
// drawn from a known allowlist of strings (status enums, leave types, etc.).
//
// Allowlist parameter is the load-bearing safeguard: any garbage in the URL
// query string that doesn't match falls back to null, so deep-links can't
// inject arbitrary values into the page state. Same disciplined narrowing
// the FormRequest enforces server-side, mirrored client-side.
//
// Three operations:
//
//   - value:  ComputedRef<T | null> — the current URL value, or null
//             when the key is absent / not a string / not in the allowlist
//   - set:    push a value into the URL via router.replace (NOT push —
//             same chip-clear discipline as useUrlNumericFilter; filter
//             changes shouldn't pollute the browser back history)
//   - clear:  remove the key from the URL via router.replace
//
// Used by LeaveRequestListPage for ?status= (the HRM dashboard's "pending
// leave requests" card links to /hrm/leave-requests?status=pending — the
// URL drives the filter, the FilterChip surfaces it).
// ─────────────────────────────────────────────────────────────────────────────

export interface UrlEnumFilterResult<T extends string> {
    /**
     * The current filter value parsed from the URL query string and
     * narrowed against the allowlist. `null` when the key is absent,
     * not a string, or not in the allowlist. Reactive — re-derives
     * on every route change so deep-links + back/forward both work.
     */
    value: ComputedRef<T | null>;
    /**
     * Write the value into the URL via router.replace. Pass null to
     * remove the key. Returns the navigation Promise so callers can
     * await it (typically tests); page-side handlers can fire-and-
     * forget via `void set(...)`.
     */
    set: (next: T | null) => Promise<void>;
    /**
     * Convenience: remove the key from the URL. Equivalent to set(null).
     * Page templates pass this directly to FilterChip's @clear.
     */
    clear: () => Promise<void>;
}

export function useUrlEnumFilter<T extends string>(
    key: string,
    allowlist: readonly T[],
): UrlEnumFilterResult<T> {
    const route = useRoute();
    const router = useRouter();

    const value = computed<T | null>(() => {
        const raw = route.query[key];
        if (typeof raw !== 'string') return null;
        // Narrow against the allowlist — anything else (typos, deep-link
        // forgery, stale bookmarks against an old enum) falls back to null
        // rather than landing in page state as a garbage value.
        return (allowlist as readonly string[]).includes(raw) ? (raw as T) : null;
    });

    async function set(next: T | null): Promise<void> {
        const newQuery = { ...route.query };
        if (next === null) {
            delete newQuery[key];
        } else {
            newQuery[key] = next;
        }
        await router.replace({ query: newQuery });
    }

    async function clear(): Promise<void> {
        await set(null);
    }

    return { value, set, clear };
}
