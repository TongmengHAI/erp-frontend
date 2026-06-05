import { describe, expect, it } from 'vitest';

import { INVITATION_ERROR_CODES } from '@/modules/invitations/types/invitation';

// ─────────────────────────────────────────────────────────────────────────────
// INVITATION_ERROR_CODES allowlist — per §10.8 frozen-const discipline.
// The InvitationInvalidPage's branch-on-error_code rendering relies on
// this allowlist to gate which UI variant fires. A drifted (mutable)
// allowlist could be polluted at runtime with non-backend codes,
// surfacing the wrong UI for invalid-token states.
// ─────────────────────────────────────────────────────────────────────────────

describe('INVITATION_ERROR_CODES allowlist', () => {
    it('contains the 4 distinct error codes from the backend InvalidInvitationException', () => {
        expect(INVITATION_ERROR_CODES).toEqual([
            'token_invalid',
            'expired',
            'cancelled',
            'accepted',
        ]);
    });

    it('LOAD-BEARING: is frozen — Object.isFrozen returns true', () => {
        expect(Object.isFrozen(INVITATION_ERROR_CODES)).toBe(true);
    });

    it('LOAD-BEARING: rejects push() mutation at runtime', () => {
        let safe = false;
        try {
            (INVITATION_ERROR_CODES as unknown as string[]).push('forged_code');
            safe = INVITATION_ERROR_CODES.length === 4;
        } catch {
            safe = true;
        }
        expect(safe).toBe(true);
        expect(INVITATION_ERROR_CODES.length).toBe(4);
    });
});
