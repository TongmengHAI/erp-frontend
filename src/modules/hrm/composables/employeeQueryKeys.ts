import type { EmployeeListParams } from '@/modules/hrm/types/employee';

// ─────────────────────────────────────────────────────────────────────────────
// Employee query-key factory.
//
// Centralises every key shape consumed by TanStack Query so:
//   1. invalidations target the right slice ("all employees" vs "employee N")
//   2. no magic-string keys land at call sites
//   3. refactors are mechanical — change the shape here, get type errors at
//      every consumer
//
// Pattern (TanStack Query convention):
//   ['employees']                         → all employee queries (broad invalidate)
//   ['employees', 'list', { ...params }]  → a specific paginated list
//   ['employees', 'detail', id]           → a specific record's detail
//
// Mutations call `queryClient.invalidateQueries({ queryKey: keys.all })`
// to refresh both lists AND open detail panes after writes.
// ─────────────────────────────────────────────────────────────────────────────

export const employeeQueryKeys = {
    all: ['employees'] as const,

    /**
     * List queries. `params` is the EmployeeListParams object as-passed-in,
     * so two calls with the same params hit the same cache entry.
     * Undefined / empty values are stripped at the API client layer before
     * the request fires, but TanStack hashes the raw object for cache keys
     * — keep call sites consistent so we don't double-cache equivalent
     * queries (e.g. `{}` vs `{ search: '' }`).
     */
    list: (params: EmployeeListParams = {}) =>
        [...employeeQueryKeys.all, 'list', params] as const,

    /** Detail queries by id. */
    detail: (id: number) => [...employeeQueryKeys.all, 'detail', id] as const,
} as const;
