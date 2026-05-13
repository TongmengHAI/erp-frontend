import { describe, expect, it } from 'vitest';

import { formatDate } from '../date';

const sampleIso = '2026-05-12T08:00:00';

describe('formatDate', () => {
    it('iso-date strips the time portion', () => {
        expect(formatDate(sampleIso, 'iso-date')).toBe('2026-05-12');
    });

    it('iso-datetime preserves date + time', () => {
        expect(formatDate(sampleIso, 'iso-datetime')).toBe('2026-05-12T08:00:00');
    });

    it('short produces locale-readable compact date (en-US)', () => {
        expect(formatDate(sampleIso, 'short', 'en-US')).toMatch(/May 12, 2026/);
    });

    it('medium includes date AND time (en-US)', () => {
        const result = formatDate(sampleIso, 'medium', 'en-US');
        expect(result).toMatch(/May 12, 2026/);
        expect(result).toMatch(/8:00/);
    });

    it('long includes weekday (en-US)', () => {
        // May 12, 2026 is a Tuesday.
        expect(formatDate(sampleIso, 'long', 'en-US')).toMatch(/Tuesday/);
    });

    it('accepts a Date object directly', () => {
        const d = new Date('2026-05-12T08:00:00');
        expect(formatDate(d, 'iso-date')).toBe('2026-05-12');
    });

    it('throws on invalid input', () => {
        expect(() => formatDate('not-a-date', 'short')).toThrow(/invalid date input/);
    });
});
