import { describe, expect, it } from 'vitest';

import { slugify } from '@/modules/super-admin/utils/slugify';

// ─────────────────────────────────────────────────────────────────────────────
// slugify — unit test. Mirrors the backend StoreTenantRequest slug
// regex EXACTLY: /^[a-z0-9]+(?:-[a-z0-9]+)*$/. Anything slugify()
// returns must pass that regex (no leading/trailing hyphens, no
// runs of hyphens, no uppercase, no underscores).
// ─────────────────────────────────────────────────────────────────────────────

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe('slugify', () => {
    it('lowercases and kebab-cases a simple name', () => {
        expect(slugify('Acme Trading')).toBe('acme-trading');
    });

    it('strips punctuation (commas, dots, Co./Ltd. markers)', () => {
        expect(slugify('Acme Trading Co., Ltd.')).toBe('acme-trading-co-ltd');
    });

    it('handles unicode diacritics via NFKD normalization', () => {
        expect(slugify('Crème Brûlée Café')).toBe('creme-brulee-cafe');
    });

    it('collapses consecutive non-alphanum runs to a single hyphen', () => {
        expect(slugify('Foo   ---   Bar')).toBe('foo-bar');
    });

    it('trims leading and trailing hyphens', () => {
        expect(slugify('---Foo Bar---')).toBe('foo-bar');
    });

    it('returns empty string for whitespace-only input', () => {
        expect(slugify('   ')).toBe('');
        expect(slugify('')).toBe('');
    });

    it('truncates to <= 63 chars and trims at the last hyphen (no half-words)', () => {
        const long = 'a'.repeat(40) + ' ' + 'b'.repeat(40); // 81 chars after join
        const result = slugify(long);
        expect(result.length).toBeLessThanOrEqual(63);
        // Did NOT leave a partial 'bbb...' tail — the smart truncation
        // cut at the last hyphen, leaving 'aaaa...' alone (40 chars).
        expect(result).toBe('a'.repeat(40));
    });

    it('every non-empty output matches the backend slug regex', () => {
        // Sweep: throw a bunch of edge-case names at it and verify
        // each non-empty result matches the contract regex.
        const inputs = [
            'Simple Name',
            'Acme Trading Co.',
            "O'Reilly & Co.",
            'Hello — World',
            '2026 Holdings',
            '...weird...input...',
        ];
        for (const input of inputs) {
            const result = slugify(input);
            if (result !== '') {
                expect(result).toMatch(SLUG_REGEX);
            }
        }
    });
});
