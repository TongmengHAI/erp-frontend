import { describe, expect, it } from 'vitest';

import { dateToHHMMSS, stringToTime } from '@/modules/hrm/utils/timeConversion';

// ─────────────────────────────────────────────────────────────────────────────
// timeConversion — pure-function tests.
//
// The util sits between the backend's HH:MM:SS wire format and
// PrimeVue's DatePicker (`timeOnly` mode) which uses a JS Date object as
// its v-model. These tests pin:
//
//   1. Round-trip fidelity (HH:MM:SS → Date → HH:MM:SS)
//   2. Null / empty safety on both sides
//   3. The "schema's regex matches what the util EMITS, not what it
//      hopes to emit" contract called out during execution — the test
//      below labelled "emits the exact HH:MM:SS shape" pins this
//   4. The parsing trap that bit dateConversion: an unbounded regex
//      would accept "99:99:99" and produce a Date object with garbage
//      time fields. The bounded regex rejects.
//   5. Single-digit hours from the picker round-trip with zero-padding
// ─────────────────────────────────────────────────────────────────────────────

describe('stringToTime', () => {
    it('parses HH:MM:SS into a Date with the picked time on today\'s date', () => {
        const d = stringToTime('09:30:45');
        expect(d).not.toBeNull();
        expect(d!.getHours()).toBe(9);
        expect(d!.getMinutes()).toBe(30);
        expect(d!.getSeconds()).toBe(45);
    });

    it('parses HH:MM (no seconds) and defaults seconds to 0', () => {
        // Tolerance for the HH:MM-only case. The backend always returns
        // HH:MM:SS but a careless intermediate layer might drop seconds;
        // we accept that input without losing user data.
        const d = stringToTime('09:30');
        expect(d).not.toBeNull();
        expect(d!.getSeconds()).toBe(0);
    });

    it('parses 00:00:00 (start of day)', () => {
        const d = stringToTime('00:00:00');
        expect(d!.getHours()).toBe(0);
        expect(d!.getMinutes()).toBe(0);
        expect(d!.getSeconds()).toBe(0);
    });

    it('parses 23:59:59 (end of day)', () => {
        const d = stringToTime('23:59:59');
        expect(d!.getHours()).toBe(23);
        expect(d!.getMinutes()).toBe(59);
        expect(d!.getSeconds()).toBe(59);
    });

    it('null in → null out', () => {
        expect(stringToTime(null)).toBeNull();
    });

    it('undefined in → null out', () => {
        expect(stringToTime(undefined)).toBeNull();
    });

    it('empty string → null out', () => {
        expect(stringToTime('')).toBeNull();
    });

    it('LOAD-BEARING: rejects out-of-range hours (24:00:00)', () => {
        // Bounded regex rejects — the picker stays empty rather than
        // landing on a Date with junk hours. Same trap dateConversion
        // documented: `new Date(...)` will accept overflow ("24:00" →
        // next-day 00:00) and silently shift the user's intent.
        expect(stringToTime('24:00:00')).toBeNull();
    });

    it('LOAD-BEARING: rejects out-of-range minutes (09:60:00)', () => {
        expect(stringToTime('09:60:00')).toBeNull();
    });

    it('LOAD-BEARING: rejects out-of-range seconds (09:00:60)', () => {
        expect(stringToTime('09:00:60')).toBeNull();
    });

    it('LOAD-BEARING: rejects 99:99:99 (the user-flagged regex trap)', () => {
        // The user explicitly flagged ^\d{2}:\d{2}:\d{2}$ as too
        // permissive — would accept 99:99:99. The actual bounded regex
        // ^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$ rejects it.
        expect(stringToTime('99:99:99')).toBeNull();
    });

    it('rejects garbage formats', () => {
        expect(stringToTime('9:00 AM')).toBeNull();
        expect(stringToTime('nine')).toBeNull();
        expect(stringToTime('09:00:00:00')).toBeNull();
    });
});

describe('dateToHHMMSS', () => {
    it('emits the EXACT HH:MM:SS shape with zero-padding', () => {
        // The schema's regex matches what the util EMITS, not what we
        // hope it emits. Single-digit hour/min/sec MUST be zero-padded
        // — the schema's [01]\d would otherwise reject "9:0:0".
        const d = new Date();
        d.setHours(9, 5, 7, 0); // 9:05:07
        expect(dateToHHMMSS(d)).toBe('09:05:07');
    });

    it('emits the picked time, not 1970-01-01 anchored time', () => {
        // Sanity check that we're using local-time getters (getHours
        // etc.), not UTC getters. Without local-time, a Date object
        // with 09:00 local would emit "08:00:00" or similar in UTC-1.
        // The picker's user-facing value should round-trip honestly.
        const d = new Date();
        d.setHours(14, 30, 0, 0);
        expect(dateToHHMMSS(d)).toBe('14:30:00');
    });

    it('emits 00:00:00 at midnight', () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        expect(dateToHHMMSS(d)).toBe('00:00:00');
    });

    it('emits 23:59:59 at end of day', () => {
        const d = new Date();
        d.setHours(23, 59, 59, 0);
        expect(dateToHHMMSS(d)).toBe('23:59:59');
    });

    it('null in → null out (not empty string — caller distinguishes "cleared" from "never set")', () => {
        // Subtle: dateToYYYYMMDD returns '' for null because forms
        // typically want a falsy string. dateToHHMMSS returns null
        // because the form's payload normalisation explicitly maps
        // null → null on the wire (clock_in is nullable), so we
        // preserve the type information.
        expect(dateToHHMMSS(null)).toBeNull();
        expect(dateToHHMMSS(undefined)).toBeNull();
    });

    it('invalid Date → null out', () => {
        expect(dateToHHMMSS(new Date('not a date'))).toBeNull();
    });
});

describe('round-trip — the contract the schema regex depends on', () => {
    it('"09:00:00" → Date → "09:00:00" survives unchanged', () => {
        const d = stringToTime('09:00:00');
        expect(dateToHHMMSS(d)).toBe('09:00:00');
    });

    it('"23:59:59" → Date → "23:59:59" survives unchanged', () => {
        const d = stringToTime('23:59:59');
        expect(dateToHHMMSS(d)).toBe('23:59:59');
    });

    it('"00:00:00" → Date → "00:00:00" survives unchanged', () => {
        const d = stringToTime('00:00:00');
        expect(dateToHHMMSS(d)).toBe('00:00:00');
    });

    it('"09:30" (HH:MM input) → Date → "09:30:00" (HH:MM:SS output) — strict emit normalises', () => {
        // The output is ALWAYS HH:MM:SS even when input was HH:MM.
        // That's the contract: emit is canonical, parse is tolerant.
        const d = stringToTime('09:30');
        expect(dateToHHMMSS(d)).toBe('09:30:00');
    });

    it('null → null → null cycle', () => {
        const d = stringToTime(null);
        expect(d).toBeNull();
        expect(dateToHHMMSS(d)).toBeNull();
    });
});
