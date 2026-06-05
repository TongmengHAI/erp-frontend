// ─────────────────────────────────────────────────────────────────────────────
// Public invitation types — mirror backend AcceptInvitationController +
// ShowInvitationController + InvalidInvitationException response shapes.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Public preview of an invitation, returned by
 * GET /api/v1/invitations/{token}.
 *
 * The shape is deliberately narrow — no IDs, no internal FKs. The
 * invitee sees tenant name, role name, inviter name, and the expiry
 * timestamp. Anything more would expand the disclosure surface for a
 * public endpoint that uses only the raw token as authentication.
 */
export interface PublicInvitation {
    email: string;
    name: string | null;
    tenant: { name: string; slug: string } | null;
    role_name: string | null;
    invited_by_name: string | null;
    /** ISO 8601. */
    expires_at: string;
}

export interface PublicInvitationResponse {
    data: PublicInvitation;
}

/**
 * Error_code values returned by InvalidInvitationException via
 * 422 on either /invitations/{token} GET or /invitations/{token}/accept
 * POST. The frontend's InvitationInvalidPage renders distinct UI per
 * code.
 */
export type InvitationErrorCode = 'token_invalid' | 'expired' | 'cancelled' | 'accepted';

export const INVITATION_ERROR_CODES: readonly InvitationErrorCode[] = Object.freeze([
    'token_invalid',
    'expired',
    'cancelled',
    'accepted',
]);

/**
 * Request body for POST /api/v1/invitations/{token}/accept.
 * Password rules match the backend AcceptInvitationRequest:
 *   • min(12) + mixedCase + numbers + symbols
 *   • uncompromised() is intentionally NOT included — see backend
 *     AcceptInvitationRequest docblock (Windows dev CA-chain note,
 *     re-enable when prod CA-chain is confirmed working).
 */
export interface AcceptInvitationRequest {
    password: string;
    name?: string | null;
}

/**
 * Successful accept response — same shape as POST /auth/login:
 * { data: { user, tenant } } so useAuthStore.fetchMe() takes over
 * from here.
 */
export interface AcceptInvitationResponse {
    data: {
        user: {
            id: number;
            name: string;
            email: string;
            email_verified_at: string | null;
            type: 'tenant_user' | 'super_admin';
            is_super_admin: boolean;
        };
        tenant: {
            id: number;
            slug: string;
            name: string;
        } | null;
    };
}
