import { describe, expect, it } from 'vitest';

import { AVATAR_PALETTE, avatarColor, initialsFromName } from '../colorHash';

describe('avatarColor', () => {
    it('is deterministic (same input → same color)', () => {
        const a = avatarColor('jane@acme.example');
        const b = avatarColor('jane@acme.example');
        expect(a).toBe(b);
    });

    it('distributes different inputs across the palette', () => {
        const samples = [
            'jane@acme.example',
            'bob@acme.example',
            'amy@acme.example',
            'kai@acme.example',
            'lee@acme.example',
            'mona@acme.example',
            'noor@acme.example',
            'priya@acme.example',
        ];
        const colors = new Set(samples.map(avatarColor));
        // Not requiring perfect distribution, just that at least 4 of 8 hues are hit.
        expect(colors.size).toBeGreaterThanOrEqual(4);
    });

    it('always returns a palette member', () => {
        const color = avatarColor('any-seed');
        expect(AVATAR_PALETTE).toContain(color);
    });

    it('handles empty / null / undefined seeds with the first palette color', () => {
        expect(avatarColor('')).toBe(AVATAR_PALETTE[0]);
        expect(avatarColor(null)).toBe(AVATAR_PALETTE[0]);
        expect(avatarColor(undefined)).toBe(AVATAR_PALETTE[0]);
    });
});

describe('initialsFromName', () => {
    it('takes first letter of first + last word for multi-word names', () => {
        expect(initialsFromName('Jane Bookkeeper')).toBe('JB');
        expect(initialsFromName('Jean-Luc Picard')).toBe('JP');
    });

    it('returns single uppercase letter for one-word names', () => {
        expect(initialsFromName('Madonna')).toBe('M');
    });

    it('returns question mark for empty/whitespace names', () => {
        expect(initialsFromName('')).toBe('?');
        expect(initialsFromName('   ')).toBe('?');
    });
});
