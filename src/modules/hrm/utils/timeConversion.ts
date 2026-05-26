// ─────────────────────────────────────────────────────────────────────────────
// Time-of-day conversion — bridges HH:MM:SS strings (backend wire format,
// matching Postgres TIME columns) and JS Date objects (PrimeVue
// DatePicker's `timeOnly` mode v-model type).
//
// Sibling of dateConversion.ts. Same discipline:
//   - Strings on the wire, Date objects only at the picker boundary
//   - Local-time anchoring (the picker emits a Date with today's calendar
//     date + the chosen hours/minutes; we only extract the time part)
//   - null in → null out so the picker can show an empty state
//
// Parsing rule: tolerate both "HH:MM:SS" and "HH:MM" on input. The
// backend's Postgres TIME column always returns "HH:MM:SS" but a future
// caller might pass "HH:MM" (e.g. seconds dropped by some intermediate
// layer); accepting both costs nothing and removes a tripwire. Emit
// is always strictly "HH:MM:SS" with zero-padded seconds — that's what
// the backend regex
//   ^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$
// and the matching Zod regex on attendanceFormSchema BOTH expect. The
// schema's regex matches what THIS util emits, not what the picker happens
// to produce.
//
// What `setHours(h, m, 0, 0)` enforces: explicitly zero the seconds AND
// milliseconds when constructing a Date from an HH:MM input, so a Date
// that survives a picker round-trip never accidentally carries a stale
// non-zero milliseconds or seconds field from elsewhere in the page state.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * "09:00:00" or "09:00" → Date at today's date with the parsed time.
 * Empty / undefined / malformed input returns null so the picker stays empty.
 *
 * The bound regex (00..23 hours, 00..59 mins/secs) matches the FormRequest
 * regex on the backend. A value that fails to parse here would also be
 * rejected by the backend — surfacing it as a null picker (an empty
 * field) rather than a Date with junk in it.
 */
export function stringToTime(value: string | null | undefined): Date | null {
    if (!value) return null;
    // Accept HH:MM:SS OR HH:MM; seconds defaults to 0 when absent.
    const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(value);
    if (!match) return null;
    const [, hh, mm, ss] = match;
    const date = new Date();
    date.setHours(Number(hh), Number(mm), Number(ss ?? '0'), 0);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Date → "09:00:00" — three zero-padded fields, always with seconds.
 * Emits the EXACT format the backend's TIME column and the Zod schema's
 * regex both accept; the schema's regex is bounded to this shape, not a
 * looser ^\d{2}:\d{2}:\d{2}$ that would accept 99:99:99.
 *
 * Null / invalid Date returns null (NOT an empty string) so consumers
 * can distinguish "user cleared the field" from "field was never set."
 * The form's payload normalisation step then maps null → null on the
 * wire (HH:MM:SS columns are nullable for absent / on_leave records).
 */
export function dateToHHMMSS(value: Date | null | undefined): string | null {
    if (!value) return null;
    if (Number.isNaN(value.getTime())) return null;
    const h = String(value.getHours()).padStart(2, '0');
    const m = String(value.getMinutes()).padStart(2, '0');
    const s = String(value.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
}
