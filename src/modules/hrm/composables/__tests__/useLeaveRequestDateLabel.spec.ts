import { describe, expect, it } from 'vitest';
import { ref } from 'vue';

import { useLeaveRequestDateLabel } from '@/modules/hrm/composables/useLeaveRequestDateLabel';

// ─────────────────────────────────────────────────────────────────────────────
// useLeaveRequestDateLabel — pure-function tests.
//
// The composable formats (start_date, end_date, day_part) into a single
// label string. Verifies:
//   - the four label variants (full_day single, full_day range,
//     morning half-day, afternoon half-day)
//   - i18n keys are consulted (NOT hardcoded English literals like
//     "(Morning)" — the user explicitly called this out)
//   - reactivity: changing day_part on a ref flips the label
//   - null input renders an empty string (loading-state safety)
//
// The i18n function `t` is injected as a fake translator that records
// the keys it's asked for. This proves the composable doesn't bypass
// i18n with a hardcoded literal — even if the rendered string happens
// to read identically in English, the test still passes only if t() was
// called with the right key.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fake `t` — interpolates {placeholders} from the vars dict and records
 * every key it was asked for. The recorded keys are asserted in the
 * "uses i18n keys, not literals" tests below.
 */
function makeFakeT(translations: Record<string, string>): {
    t: (key: string, vars?: Record<string, unknown>) => string;
    calls: string[];
} {
    const calls: string[] = [];
    const t = (key: string, vars: Record<string, unknown> = {}): string => {
        calls.push(key);
        const tpl = translations[key] ?? `[${key}]`;
        return tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
    };
    return { t, calls };
}

const DEFAULT_TRANSLATIONS: Record<string, string> = {
    'hrm.leaveRequest.dateLabel.singleDay': '{date}',
    'hrm.leaveRequest.dateLabel.range': '{from} → {to}',
    'hrm.leaveRequest.dateLabel.halfDay': '{date} ({dayPart})',
    'hrm.leaveRequest.dayPart.full_day': 'Full day',
    'hrm.leaveRequest.dayPart.morning': 'Morning',
    'hrm.leaveRequest.dayPart.afternoon': 'Afternoon',
};

describe('useLeaveRequestDateLabel', () => {
    describe('label variants', () => {
        it('full_day, single date → renders just the formatted date', () => {
            const { t } = makeFakeT(DEFAULT_TRANSLATIONS);
            const { label } = useLeaveRequestDateLabel(
                { start_date: '2026-05-22', end_date: '2026-05-22', day_part: 'full_day' },
                t,
            );
            // Locale-aware short date — exact spelling depends on the
            // host locale, but it MUST not include the arrow (no range)
            // and MUST not include a paren (no day-part suffix).
            expect(label.value).not.toContain('→');
            expect(label.value).not.toContain('(');
            expect(label.value).toMatch(/May|Mai|5/); // sanity check the month rendered
        });

        it('full_day, multi-day → renders "from → to"', () => {
            const { t } = makeFakeT(DEFAULT_TRANSLATIONS);
            const { label } = useLeaveRequestDateLabel(
                { start_date: '2026-05-22', end_date: '2026-05-26', day_part: 'full_day' },
                t,
            );
            expect(label.value).toContain('→');
            expect(label.value).not.toContain('(');
        });

        it('morning → renders single date with (Morning) suffix', () => {
            const { t } = makeFakeT(DEFAULT_TRANSLATIONS);
            const { label } = useLeaveRequestDateLabel(
                { start_date: '2026-05-22', end_date: '2026-05-22', day_part: 'morning' },
                t,
            );
            expect(label.value).toContain('(Morning)');
            expect(label.value).not.toContain('→');
        });

        it('afternoon → renders single date with (Afternoon) suffix', () => {
            const { t } = makeFakeT(DEFAULT_TRANSLATIONS);
            const { label } = useLeaveRequestDateLabel(
                { start_date: '2026-05-22', end_date: '2026-05-22', day_part: 'afternoon' },
                t,
            );
            expect(label.value).toContain('(Afternoon)');
        });

        it('null input → renders empty string (loading-state safety)', () => {
            const { t } = makeFakeT(DEFAULT_TRANSLATIONS);
            const { label } = useLeaveRequestDateLabel(null, t);
            expect(label.value).toBe('');
        });
    });

    describe('i18n key discipline — composable consults t(), does NOT hardcode literals', () => {
        it('full_day single-day calls hrm.leaveRequest.dateLabel.singleDay', () => {
            const { t, calls } = makeFakeT(DEFAULT_TRANSLATIONS);
            const { label } = useLeaveRequestDateLabel(
                { start_date: '2026-05-22', end_date: '2026-05-22', day_part: 'full_day' },
                t,
            );
            void label.value;
            expect(calls).toContain('hrm.leaveRequest.dateLabel.singleDay');
        });

        it('full_day range calls hrm.leaveRequest.dateLabel.range', () => {
            const { t, calls } = makeFakeT(DEFAULT_TRANSLATIONS);
            const { label } = useLeaveRequestDateLabel(
                { start_date: '2026-05-22', end_date: '2026-05-26', day_part: 'full_day' },
                t,
            );
            void label.value;
            expect(calls).toContain('hrm.leaveRequest.dateLabel.range');
        });

        it('morning calls dateLabel.halfDay AND dayPart.morning (the suffix is i18n, not literal)', () => {
            // The LOAD-BEARING test for the i18n discipline. The
            // composable could "work" by hardcoding "(Morning)" but the
            // user explicitly demanded the suffix flow through i18n.
            // This test fails if the composable bypasses dayPart.morning.
            const { t, calls } = makeFakeT(DEFAULT_TRANSLATIONS);
            const { label } = useLeaveRequestDateLabel(
                { start_date: '2026-05-22', end_date: '2026-05-22', day_part: 'morning' },
                t,
            );
            void label.value;
            expect(calls).toContain('hrm.leaveRequest.dateLabel.halfDay');
            expect(calls).toContain('hrm.leaveRequest.dayPart.morning');
        });

        it('afternoon calls dateLabel.halfDay AND dayPart.afternoon', () => {
            const { t, calls } = makeFakeT(DEFAULT_TRANSLATIONS);
            const { label } = useLeaveRequestDateLabel(
                { start_date: '2026-05-22', end_date: '2026-05-22', day_part: 'afternoon' },
                t,
            );
            void label.value;
            expect(calls).toContain('hrm.leaveRequest.dateLabel.halfDay');
            expect(calls).toContain('hrm.leaveRequest.dayPart.afternoon');
        });

        it('uses translated day-part literal — swap the translation and the rendered label changes', () => {
            // Sanity check the i18n indirection: rendering with French
            // translations produces a French label without any code change.
            // Proves the composable doesn't reach around t() for the
            // day-part word.
            const { t } = makeFakeT({
                ...DEFAULT_TRANSLATIONS,
                'hrm.leaveRequest.dayPart.morning': 'Matin',
            });
            const { label } = useLeaveRequestDateLabel(
                { start_date: '2026-05-22', end_date: '2026-05-22', day_part: 'morning' },
                t,
            );
            expect(label.value).toContain('(Matin)');
            expect(label.value).not.toContain('(Morning)');
        });
    });

    describe('reactivity — label re-derives when inputs change', () => {
        it('flips from single-day to range when end_date moves out', () => {
            const { t } = makeFakeT(DEFAULT_TRANSLATIONS);
            const row = ref({
                start_date: '2026-05-22',
                end_date: '2026-05-22',
                day_part: 'full_day' as const,
            });
            const { label } = useLeaveRequestDateLabel(row, t);

            expect(label.value).not.toContain('→');

            row.value = { ...row.value, end_date: '2026-05-26' };

            expect(label.value).toContain('→');
        });

        it('flips from full_day to morning when day_part toggles', () => {
            const { t } = makeFakeT(DEFAULT_TRANSLATIONS);
            const row = ref<{ start_date: string; end_date: string; day_part: 'full_day' | 'morning' | 'afternoon' }>({
                start_date: '2026-05-22',
                end_date: '2026-05-22',
                day_part: 'full_day',
            });
            const { label } = useLeaveRequestDateLabel(row, t);

            expect(label.value).not.toContain('(Morning)');

            row.value = { ...row.value, day_part: 'morning' };

            expect(label.value).toContain('(Morning)');
        });
    });
});
