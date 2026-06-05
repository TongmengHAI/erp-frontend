import { apiClient } from '@/shared/api/client';

import type {
    AcceptInvitationRequest,
    AcceptInvitationResponse,
    PublicInvitationResponse,
} from '@/modules/invitations/types/invitation';

// ─────────────────────────────────────────────────────────────────────────────
// Public invitation API — typed wrappers over apiClient.
//
//   GET   /api/v1/invitations/{token}             → PublicInvitationResponse
//   POST  /api/v1/invitations/{token}/accept      → AcceptInvitationResponse
//
// Both endpoints are public (NO auth required). The 422 path (invalid
// token / expired / cancelled / already-accepted) is handled at the
// page layer via error_code branching. Auto-login on success: the
// backend issues a Sanctum session cookie inside the POST handler;
// the SPA's next request (auth.fetchMe()) sees the authenticated
// session.
// ─────────────────────────────────────────────────────────────────────────────

export async function showInvitation(token: string): Promise<PublicInvitationResponse> {
    const res = await apiClient.get<PublicInvitationResponse>(
        `/invitations/${token}`,
    );
    return res.data;
}

export async function acceptInvitation(
    token: string,
    payload: AcceptInvitationRequest,
): Promise<AcceptInvitationResponse> {
    const res = await apiClient.post<AcceptInvitationResponse>(
        `/invitations/${token}/accept`,
        payload,
    );
    return res.data;
}
