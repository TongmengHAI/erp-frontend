// ─────────────────────────────────────────────────────────────────────────────
// Date formatting utility.
//
// Five formats per F2 master plan decision #7 (revised):
//   iso-datetime → 2026-05-12T08:00:00          (machine, full ISO)
//   iso-date     → 2026-05-12                    (machine, date-only)
//   short        → May 12, 2026                  (human, compact, locale-driven)
//   medium       → May 12, 2026, 8:00 AM         (human, with time)
//   long         → Monday, May 12, 2026          (human, formal)
//
// `iso-*` formats are locale-independent by definition. Human formats use
// Intl.DateTimeFormat with the supplied locale (default 'en'). If the browser
// doesn't support the requested locale, Intl falls back to en — no special-case
// logic here.
// ─────────────────────────────────────────────────────────────────────────────

export type DateFormat = 'iso-datetime' | 'iso-date' | 'short' | 'medium' | 'long';

const pad2 = (n: number) => n.toString().padStart(2, '0');

function toDate(input: string | Date): Date {
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) {
        throw new Error(`formatDate: invalid date input: ${JSON.stringify(input)}`);
    }
    return d;
}

/**
 * Format a date for display. See module docstring for the five format names.
 */
export function formatDate(input: string | Date, format: DateFormat = 'short', locale = 'en'): string {
    const d = toDate(input);

    if (format === 'iso-date') {
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }
    if (format === 'iso-datetime') {
        return (
            `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
            `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
        );
    }

    const options: Intl.DateTimeFormatOptions =
        format === 'short'
            ? { year: 'numeric', month: 'short', day: 'numeric' }
            : format === 'medium'
              ? {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                }
              : { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };

    return new Intl.DateTimeFormat(locale, options).format(d);
}
