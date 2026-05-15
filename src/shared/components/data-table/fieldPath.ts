// ─────────────────────────────────────────────────────────────────────────────
// Field-path resolver — dot-notation lookup on arbitrary row objects.
//
// Hand-rolled rather than pulling lodash.get: ~15 LOC, fully typed, null-safe,
// no shipped dependency for one function. (lodash is a transitive dep in the
// lockfile but not a direct one — per §7.G we don't promote it without ask.)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a dot-notation path against a row object. Returns `undefined`
 * for any missing intermediate or non-object cursor, never throws.
 *
 *   resolveFieldPath({ a: { b: 7 } }, 'a.b')   → 7
 *   resolveFieldPath({ a: null },     'a.b')   → undefined
 *   resolveFieldPath(null,            'a')     → undefined
 */
export function resolveFieldPath(row: unknown, path: string): unknown {
    if (!path || row == null || typeof row !== 'object') return undefined;
    const segments = path.split('.');
    let cursor: unknown = row;
    for (const seg of segments) {
        if (cursor == null || typeof cursor !== 'object') return undefined;
        cursor = (cursor as Record<string, unknown>)[seg];
    }
    return cursor;
}

/**
 * DEV-only: emits `console.warn` once for a column whose field path
 * resolves to `undefined` on the first row. Skipped for `type: 'custom'`
 * (custom slots may legitimately ignore the field). Caller is expected to
 * call this at most once per (column, data) pair — typically from
 * `onMounted` + `watch(() => props.columns)` in DataTable.vue.
 */
export function warnUnresolvedField(
    rows: readonly unknown[],
    column: { field: string; label: string; type: string },
): void {
    if (!import.meta.env.DEV) return;
    if (column.type === 'custom') return;
    if (rows.length === 0) return;
    const resolved = resolveFieldPath(rows[0], column.field);
    if (resolved === undefined) {
        console.warn(
            `[DataTable] column "${column.label}" (field: "${column.field}", type: "${column.type}") resolved undefined on the first row. Check the field path.`,
        );
    }
}
