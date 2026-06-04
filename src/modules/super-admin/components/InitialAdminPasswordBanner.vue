<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';

// ─────────────────────────────────────────────────────────────────────────────
// InitialAdminPasswordBanner — the ONE-TIME display surface for the
// initial tenant admin's plaintext password (Session 6 plan tightening
// #2). First §10 candidate for a "one-time secret display" pattern;
// implemented concretely here for tenant creation, future secret-
// displays (e.g. Stage 2 SA-generated API tokens) inherit the shape.
//
// Discipline:
//   • Prominent banner, not a toast — toasts are dismissible without
//     attention; this is a copy-then-acknowledge moment.
//   • Plaintext displayed AS-IS in a code element (not obscured) —
//     obscuring would defeat the "copy this NOW" intent.
//   • Copy-to-clipboard button + acknowledgement button. Both are
//     side-effect-only; closing the banner via the X also acknowledges.
//   • Copy uses navigator.clipboard.writeText() — fails silently on
//     non-secure contexts (localhost is fine; if it fails the user
//     can still select + Ctrl-C).
//   • After acknowledgement the parent unmounts the banner via the
//     `acknowledged` event. The password is GONE from the SPA — no
//     re-fetch path, no localStorage, no Vuex. Future resets via the
//     standard forgot-password flow (when wired).
//
// The component does NOT render the password itself; the parent
// controls the lifecycle (mount on create-success, unmount on
// acknowledge). This keeps the secret out of any persisted store and
// scopes its lifetime to the visible UI.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    /** The plaintext one-time password to display. */
    password: string;
    /** The admin's email — shown alongside the password for clarity. */
    adminEmail: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    acknowledged: [];
}>();

const { t } = useI18n();
const toast = useToast();

const copied = ref<boolean>(false);

async function copyToClipboard(): Promise<void> {
    // navigator.clipboard requires a secure context (HTTPS or localhost).
    // Fall back to nothing — the user can manually select + copy.
    if (!navigator.clipboard) return;
    try {
        await navigator.clipboard.writeText(props.password);
        copied.value = true;
        toast.add({
            severity: 'success',
            summary: t('superAdmin.tenants.create.banner.copyToast'),
            life: 2000,
        });
    } catch {
        // Clipboard write failed (permission denied, non-secure context
        // edge case). User can still select-and-copy manually.
    }
}

function onAcknowledge(): void {
    emit('acknowledged');
}
</script>

<template>
    <div
        role="alert"
        class="mb-6 rounded-lg border-2 border-warning bg-warning-bg p-5"
        data-testid="initial-admin-password-banner"
    >
        <div class="flex items-start gap-3">
            <i
                class="pi pi-exclamation-triangle text-2xl text-warning-text"
                aria-hidden="true"
            ></i>
            <div class="flex-1">
                <h3 class="text-base font-semibold text-warning-text">
                    {{ t('superAdmin.tenants.create.banner.title') }}
                </h3>
                <p class="mt-1 text-sm text-warning-text">
                    {{ t('superAdmin.tenants.create.banner.warning') }}
                </p>

                <div class="mt-4 rounded-md border border-border-default bg-surface p-3">
                    <p class="text-xs font-medium text-text-tertiary">
                        {{ t('superAdmin.tenants.create.banner.adminLabel') }}
                    </p>
                    <p class="text-sm text-text-primary" data-testid="banner-admin-email">
                        {{ adminEmail }}
                    </p>
                    <p class="mt-3 text-xs font-medium text-text-tertiary">
                        {{ t('superAdmin.tenants.create.banner.passwordLabel') }}
                    </p>
                    <code
                        class="block break-all rounded bg-surface-sunken px-3 py-2 font-mono text-sm text-text-primary"
                        data-testid="banner-password-value"
                    >{{ password }}</code>
                </div>

                <p class="mt-4 text-sm text-warning-text">
                    {{ t('superAdmin.tenants.create.banner.recoveryNote') }}
                </p>

                <div class="mt-5 flex items-center gap-3">
                    <Button
                        :label="copied
                            ? t('superAdmin.tenants.create.banner.copied')
                            : t('superAdmin.tenants.create.banner.copy')"
                        :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
                        severity="secondary"
                        data-testid="banner-copy-button"
                        @click="copyToClipboard"
                    />
                    <Button
                        :label="t('superAdmin.tenants.create.banner.acknowledge')"
                        icon="pi pi-check-circle"
                        data-testid="banner-acknowledge-button"
                        @click="onAcknowledge"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
