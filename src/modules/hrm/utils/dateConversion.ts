// ─────────────────────────────────────────────────────────────────────────────
// Date conversion — bridges YYYY-MM-DD strings (backend wire format) and
// JS Date objects (PrimeVue DatePicker's v-model type).
//
// Parsing rule: split-and-construct in LOCAL time, not `new Date('YYYY-MM-DD')`.
// The latter parses as UTC midnight, which displays as the previous day in any
// negative timezone (UTC-1 and below) when rendered with local-time methods —
// the same off-by-one-day bug that's bitten every JS codebase that touches
// dates. Constructing with `new Date(y, m-1, d)` anchors to local midnight and
// matches what the user typed in the picker.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * "2024-03-15" → Date at local midnight 2024-03-15.
 * Empty / undefined / malformed input returns null so the picker stays empty.
 */
export function stringToDate(value: string | undefined | null): Date | null {
    if (!value) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const [, y, m, d] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Date → "2024-03-15". Uses local-time getters so what the user picked
 * (e.g. March 15 in their timezone) round-trips back as "2024-03-15"
 * regardless of UTC offset.
 */
export function dateToYYYYMMDD(value: Date | null | undefined): string {
    if (!value) return '';
    if (Number.isNaN(value.getTime())) return '';
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
