<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import { useRouter } from 'vue-router';

import type { InvitationErrorCode } from '@/modules/invitations/types/invitation';
import { AUTH_ROUTES } from '@/modules/auth/routes';

// ─────────────────────────────────────────────────────────────────────────────
// InvitationInvalidPage — renders one of four distinct user-facing
// surfaces per the backend's InvalidInvitationException error_code:
//
//   token_invalid — typo, forged, or resent-and-invalidated link.
//                   "This invitation link is not valid."
//   expired       — past expires_at. Inviter must re-send.
//                   "This invitation has expired."
//   cancelled     — admin cancelled. No re-issue path from this UI.
//                   "This invitation has been cancelled."
//   accepted      — already used. Sign-in is the correct path.
//                   "This invitation has already been used. Sign in instead."
//
// The 'accepted' variant exposes a "Sign in" affordance specifically;
// the other three deliberately do NOT, because clicking through to
// /login from an invalid invitation is the wrong user path (the user
// won't have credentials yet; only the 'accepted' case implies they
// already do).
//
// All four variants share the same chrome (centered card, icon, title,
// description) — only copy + affordances differ. Keeps the UX
// recognizable as "invitation gone wrong" while distinguishing the
// reason.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    errorCode: InvitationErrorCode;
}
const props = defineProps<Props>();

const { t } = useI18n();
const router = useRouter();

const i18nKey = computed<string>(() => {
    return `invitations.invalid.${props.errorCode}`;
});

const icon = computed<string>(() => {
    switch (props.errorCode) {
        case 'expired':
            return 'pi pi-clock';
        case 'cancelled':
            return 'pi pi-ban';
        case 'accepted':
            return 'pi pi-check-circle';
        case 'token_invalid':
        default:
            return 'pi pi-exclamation-triangle';
    }
});

function goToLogin(): void {
    void router.push({ name: AUTH_ROUTES.LOGIN });
}
</script>

<template>
    <div
        class="flex min-h-screen items-center justify-center bg-surface-sunken px-4"
        :data-testid="`invitation-invalid-${errorCode}`"
    >
        <div class="w-full max-w-md rounded-lg border border-border-default bg-surface p-8 text-center shadow-sm">
            <div class="mb-4 flex justify-center">
                <i :class="[icon, 'text-4xl text-text-tertiary']" aria-hidden="true" />
            </div>
            <h1 class="mb-2 text-xl font-semibold text-text-primary">
                {{ t(`${i18nKey}.title`) }}
            </h1>
            <p class="mb-6 text-sm text-text-secondary">
                {{ t(`${i18nKey}.description`) }}
            </p>

            <!-- Only the 'accepted' variant surfaces a "Sign in instead"
                 CTA. The other three lead to dead ends from this URL;
                 the user must coordinate with their admin for a re-issue. -->
            <Button
                v-if="errorCode === 'accepted'"
                :label="t('invitations.invalid.accepted.cta')"
                icon="pi pi-sign-in"
                severity="primary"
                data-testid="invitation-invalid-accepted-cta"
                @click="goToLogin"
            />
            <p
                v-else
                class="text-xs text-text-tertiary"
                :data-testid="`invitation-invalid-${errorCode}-footer`"
            >
                {{ t(`${i18nKey}.footer`) }}
            </p>
        </div>
    </div>
</template>
