import { describe, expect, it } from 'vitest';

import { dateToYYYYMMDD, stringToDate } from '@/modules/hrm/utils/dateConversion';

// ─────────────────────────────────────────────────────────────────────────────
// dateConversion — load-bearing for the form's hire_date round-trip.
// The off-by-one-day timezone trap (new Date('YYYY-MM-DD') parses as UTC)
// is exactly the bug Day 6 surfaced. These tests pin the fix so any future
// "improvement" to use Date constructor parsing fails loudly.
// ─────────────────────────────────────────────────────────────────────────────

describe('stringToDate', () => {
    it('parses YYYY-MM-DD into a local-midnight Date', () => {
        const d = stringToDate('2024-03-15');
        expect(d).not.toBeNull();
        expect(d!.getFullYear()).toBe(2024);
        expect(d!.getMonth()).toBe(2); // March, 0-indexed
        expect(d!.getDate()).toBe(15);
    });

    it('returns null for empty / null / undefined input', () => {
        expect(stringToDate('')).toBeNull();
        expect(stringToDate(null)).toBeNull();
        expect(stringToDate(undefined)).toBeNull();
    });

    it('returns null for malformed input (date-like ISO timestamps, slashes, junk)', () => {
        expect(stringToDate('2024-03-15T00:00:00Z')).toBeNull();
        expect(stringToDate('2024/03/15')).toBeNull();
        expect(stringToDate('not-a-date')).toBeNull();
    });
});

describe('dateToYYYYMMDD', () => {
    it('formats Date as YYYY-MM-DD using local components', () => {
        // Construct in local time to avoid TZ-dependent assertions.
        expect(dateToYYYYMMDD(new Date(2024, 2, 15))).toBe('2024-03-15');
        expect(dateToYYYYMMDD(new Date(1999, 11, 31))).toBe('1999-12-31');
    });

    it('pads single-digit months and days', () => {
        expect(dateToYYYYMMDD(new Date(2024, 0, 1))).toBe('2024-01-01');
        expect(dateToYYYYMMDD(new Date(2024, 8, 9))).toBe('2024-09-09');
    });

    it('returns empty string for null / undefined / invalid date', () => {
        expect(dateToYYYYMMDD(null)).toBe('');
        expect(dateToYYYYMMDD(undefined)).toBe('');
        expect(dateToYYYYMMDD(new Date('not a date'))).toBe('');
    });
});

describe('round-trip stability', () => {
    it('string → Date → string returns the original string', () => {
        const original = '2026-05-19';
        const round = dateToYYYYMMDD(stringToDate(original));
        expect(round).toBe(original);
    });

    it('round-trip works across DST boundaries (March + November)', () => {
        // March 10 2024 is a DST transition day in US locales. The local-time
        // constructor avoids the UTC-midnight-then-displayed-locally trap
        // that flipped the date back one day in earlier (broken) implementations.
        expect(dateToYYYYMMDD(stringToDate('2024-03-10'))).toBe('2024-03-10');
        expect(dateToYYYYMMDD(stringToDate('2024-11-03'))).toBe('2024-11-03');
    });
});
