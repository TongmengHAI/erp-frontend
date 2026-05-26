import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue';

import type { DayPart, LeaveType } from '@/modules/hrm/types/leaveRequest';

// ─────────────────────────────────────────────────────────────────────────────
// useLeaveRequestDateLabel — pure formatting composable.
//
// Given (start_date, end_date, day_part) and an i18n function `t`,
// returns a single human-readable label that adapts to the row's
// day_part:
//
//   full_day, single date  → "Fri, May 22"
//   full_day, multi-day    → "Fri, May 22 → Fri, May 26"
//   morning                → "Fri, May 22 (Morning)"
//   afternoon              → "Fri, May 22 (Afternoon)"
//
// `t` is passed in (not pulled from useI18n internally) so the composable
// stays pure-functional and trivially testable against hand-crafted
// i18n fixtures — no need to mount a Vue + vue-i18n test harness. Every
// callsite already has `const { t } = useI18n()` available so the
// ergonomic cost is minimal.
//
// Format strings live in i18n (hrm.leaveRequest.dateLabel.*), NOT
// hardcoded here. The "(Morning)" / "(Afternoon)" suffix flows through
// hrm.leaveRequest.dayPart.* keys — adding a future French translation
// is a JSON edit, not a code edit. Same discipline as every other
// user-facing string in the app.
//
// Date formatting itself goes through toLocaleDateString with a fixed
// option bag — same locale-aware rendering as DateDisplay's "short"
// variant. The composable doesn't take a locale param explicitly; it
// uses the browser default, which matches the i18n locale via the
// Vue i18n plugin's locale propagation.
// ─────────────────────────────────────────────────────────────────────────────

export interface LeaveRequestDateLabelInput {
    start_date: string;
    end_date: string;
    day_part: DayPart;
    /** Carried through for forward extension (e.g. label could include
     *  type when surfaced in a context-free toast). Not currently used
     *  in the rendered string but kept on the input shape so callers
     *  can pass the full brief/full resource without filtering. */
    leave_type?: LeaveType;
}

export interface LeaveRequestDateLabelResult {
    /**
     * The rendered label. Single string suitable for direct insertion
     * into a `<dd>` or a table cell. Reactive — updates when any of
     * (start_date, end_date, day_part) changes.
     */
    label: ComputedRef<string>;
}

type TranslateFn = (key: string, vars?: Record<string, unknown>) => string;

/**
 * Format a YYYY-MM-DD string as "Fri, May 22" (locale-aware short
 * form). Date construction uses `T00:00:00` to anchor at local midnight
 * — without it, the bare "YYYY-MM-DD" parses as UTC midnight and
 * timezones west of UTC roll back to the previous calendar day. Same
 * trap the dateConversion util documents.
 */
function formatShortDate(yyyymmdd: string): string {
    const d = new Date(`${yyyymmdd}T00:00:00`);
    return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Pure (non-composable) formatter. Same logic the composable wraps
 * with reactivity. Exposed separately so list pages can call it
 * per-row inside a v-for cell — composables shouldn't be invoked
 * inside loops (the reactivity scope binding is per-component, not
 * per-row).
 *
 * Returns empty string for null input (caller's loading-state safety
 * matches the composable's behavior).
 */
export function formatLeaveRequestDateLabel(
    input: LeaveRequestDateLabelInput | null,
    t: TranslateFn,
): string {
    if (input === null) return '';

    const startFormatted = formatShortDate(input.start_date);

    if (input.day_part !== 'full_day') {
        // Half-day: single date with parenthetical day-part label.
        // The day_part label flows through i18n so translations get
        // the same "(Morning)" / "(Matin)" / "(ព្រឹក)" rendering
        // without any code change here.
        return t('hrm.leaveRequest.dateLabel.halfDay', {
            date: startFormatted,
            dayPart: t(`hrm.leaveRequest.dayPart.${input.day_part}`),
        });
    }

    // Full-day: range or single date depending on date equality.
    // String comparison works because the format is fixed YYYY-MM-DD
    // (lexicographic === chronological).
    if (input.start_date === input.end_date) {
        return t('hrm.leaveRequest.dateLabel.singleDay', {
            date: startFormatted,
        });
    }

    return t('hrm.leaveRequest.dateLabel.range', {
        from: startFormatted,
        to: formatShortDate(input.end_date),
    });
}

export function useLeaveRequestDateLabel(
    input: MaybeRefOrGetter<LeaveRequestDateLabelInput | null>,
    t: TranslateFn,
): LeaveRequestDateLabelResult {
    const label = computed<string>(() =>
        formatLeaveRequestDateLabel(toValue(input), t),
    );

    return { label };
}
