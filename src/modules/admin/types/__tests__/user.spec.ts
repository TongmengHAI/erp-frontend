import { describe, expect, it } from 'vitest';

import { USER_STATUSES, USER_LIFECYCLE_FILTERS } from '@/modules/admin/types/user';

// ─────────────────────────────────────────────────────────────────────────────
// USER_STATUSES + USER_LIFECYCLE_FILTERS extensibility spec.
//
// Per CLAUDE.md §10.8 — allowlists passed to useUrlEnumFilter MUST be
// frozen at module scope, AND the EXPORTING file must contain a test
// confirming extensibility is impossible. The defence's value depends
// on the allowlist being immutable at runtime; a mutable allowlist
// that drifts at runtime defeats the deep-link-forgery defence.
//
// The spec lives in this file (alongside the const) rather than in a
// consumer test so it survives consumer refactors — same shape as
// TENANT_STATUSES' spec (Stage 4 antecedent).
// ─────────────────────────────────────────────────────────────────────────────

describe('USER_STATUSES allowlist', () => {
    it('contains exactly the active/inactive enum values from the backend UserStatus', () => {
        expect(USER_STATUSES).toEqual(['active', 'inactive']);
    });

    it('LOAD-BEARING: is frozen — Object.isFrozen returns true', () => {
        expect(Object.isFrozen(USER_STATUSES)).toBe(true);
    });

    it('LOAD-BEARING: rejects push() mutation at runtime', () => {
        // In strict mode (TypeScript modules are strict), mutating a
        // frozen array throws TypeError. The catch-and-assert pattern
        // works regardless of how the runtime surfaces the rejection.
        let threwOrSilentlyIgnored = false;
        try {
            (USER_STATUSES as unknown as string[]).push('gibberish');
            // If the engine silently ignores (non-strict path), the
            // push should still NOT have changed the array.
            threwOrSilentlyIgnored = USER_STATUSES.length === 2;
        } catch {
            threwOrSilentlyIgnored = true;
        }
        expect(threwOrSilentlyIgnored).toBe(true);
        expect(USER_STATUSES.length).toBe(2);
    });

    it('LOAD-BEARING: rejects splice() mutation at runtime', () => {
        let safe = false;
        try {
            (USER_STATUSES as unknown as string[]).splice(0, 1);
            safe = USER_STATUSES.length === 2;
        } catch {
            safe = true;
        }
        expect(safe).toBe(true);
        expect(USER_STATUSES.length).toBe(2);
    });
});

describe('USER_LIFECYCLE_FILTERS allowlist', () => {
    it("contains the three lifecycle states the chip can take", () => {
        expect(USER_LIFECYCLE_FILTERS).toEqual(['active', 'inactive', 'deactivated']);
    });

    it('LOAD-BEARING: is frozen — Object.isFrozen returns true', () => {
        expect(Object.isFrozen(USER_LIFECYCLE_FILTERS)).toBe(true);
    });

    it('LOAD-BEARING: rejects push() mutation at runtime', () => {
        let safe = false;
        try {
            (USER_LIFECYCLE_FILTERS as unknown as string[]).push('gibberish');
            safe = USER_LIFECYCLE_FILTERS.length === 3;
        } catch {
            safe = true;
        }
        expect(safe).toBe(true);
        expect(USER_LIFECYCLE_FILTERS.length).toBe(3);
    });
});
