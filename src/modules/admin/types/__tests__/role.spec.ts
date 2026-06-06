import { describe, expect, it } from 'vitest';

import { ROLE_KIND_FILTERS } from '@/modules/admin/types/role';

// ─────────────────────────────────────────────────────────────────────────────
// ROLE_KIND_FILTERS extensibility spec.
//
// Per CLAUDE.md §10.8 — allowlists passed to useUrlEnumFilter MUST be
// frozen at module scope, AND the EXPORTING file must contain a test
// confirming extensibility is impossible. The defence's value depends
// on the allowlist being immutable at runtime; a mutable allowlist
// that drifts at runtime defeats the deep-link-forgery defence.
//
// The spec lives in this file (alongside the const) rather than in a
// consumer test so it survives consumer refactors — same shape as
// TENANT_STATUSES' spec (Stage 4 antecedent) and USER_STATUSES'.
// ─────────────────────────────────────────────────────────────────────────────

describe('ROLE_KIND_FILTERS allowlist', () => {
    it('contains exactly the system/custom kind values from the backend kind filter', () => {
        expect(ROLE_KIND_FILTERS).toEqual(['system', 'custom']);
    });

    it('LOAD-BEARING: is frozen — Object.isFrozen returns true', () => {
        expect(Object.isFrozen(ROLE_KIND_FILTERS)).toBe(true);
    });

    it('LOAD-BEARING: rejects push() mutation at runtime', () => {
        let threwOrSilentlyIgnored = false;
        try {
            (ROLE_KIND_FILTERS as unknown as string[]).push('gibberish');
            threwOrSilentlyIgnored = ROLE_KIND_FILTERS.length === 2;
        } catch {
            threwOrSilentlyIgnored = true;
        }
        expect(threwOrSilentlyIgnored).toBe(true);
        expect(ROLE_KIND_FILTERS.length).toBe(2);
    });

    it('LOAD-BEARING: rejects splice() mutation at runtime', () => {
        let safe = false;
        try {
            (ROLE_KIND_FILTERS as unknown as string[]).splice(0, 1);
            safe = ROLE_KIND_FILTERS.length === 2;
        } catch {
            safe = true;
        }
        expect(safe).toBe(true);
        expect(ROLE_KIND_FILTERS.length).toBe(2);
    });
});
