import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useMutation, useQuery } from '@tanstack/vue-query';

import * as invitationsApi from '@/modules/invitations/api/invitations';
import type { AcceptInvitationRequest } from '@/modules/invitations/types/invitation';

// ─────────────────────────────────────────────────────────────────────────────
// Public invitation composables — TanStack Query wrappers.
//
// useInvitationQuery: the page-mount preview fetch. Reactive on `token`
//   (router param). retry: false — token-invalid / expired / cancelled /
//   accepted are all 422 with stable error_codes that the page handles
//   immediately; retrying just hammers the backend.
//
// useAcceptInvitationMutation: the submit. Auto-login is handled by the
//   backend setting the Sanctum session cookie inside the POST. The
//   caller follows up with auth.fetchMe() to populate the store.
// ─────────────────────────────────────────────────────────────────────────────

export function useInvitationQuery(token: MaybeRefOrGetter<string>) {
    return useQuery({
        queryKey: computed(() => ['invitations', 'show', toValue(token)] as const),
        queryFn: () => invitationsApi.showInvitation(toValue(token)),
        retry: false,
        // Token-state queries shouldn't be cached for long — an accept
        // could have happened in another tab, an expiry could have
        // crossed.
        staleTime: 0,
        enabled: computed(() => toValue(token).length > 0),
    });
}

export function useAcceptInvitationMutation(token: MaybeRefOrGetter<string>) {
    return useMutation({
        mutationFn: (payload: AcceptInvitationRequest) =>
            invitationsApi.acceptInvitation(toValue(token), payload),
        retry: false,
    });
}
