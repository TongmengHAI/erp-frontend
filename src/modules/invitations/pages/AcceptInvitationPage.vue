<script setup lang="ts">
import axios from 'axios';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useField, useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';

import LoadingState from '@/shared/components/state/LoadingState.vue';
import ErrorState from '@/shared/components/state/ErrorState.vue';
import FormField from '@/shared/components/form/FormField.vue';
import InvitationInvalidPage from '@/modules/invitations/pages/InvitationInvalidPage.vue';

import {
    useAcceptInvitationMutation,
    useInvitationQuery,
} from '@/modules/invitations/composables/useInvitation';
import {
    acceptInvitationSchema,
    type AcceptInvitationFormValues,
} from '@/modules/invitations/schemas/acceptInvitationSchema';
import {
    INVITATION_ERROR_CODES,
    type InvitationErrorCode,
} from '@/modules/invitations/types/invitation';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { getDefaultRoute } from '@/shared/launcher/getDefaultRoute';

// ─────────────────────────────────────────────────────────────────────────────
// AcceptInvitationPage — public route /invitation/:token.
//
// 5-state matrix at the PAGE level (§10.18):
//
//   1. loading       — initial preview fetch in-flight
//   2. invalid       — preview returned 422 with error_code → render
//                      InvitationInvalidPage with the corresponding
//                      error_code variant
//   3. error         — non-422 network failure
//   4. populated     — preview rendered + password form
//   5. (no permission-denied — public route, no auth context)
//
// On submit success:
//   • Backend issues the Sanctum session cookie inside the POST handler
//     (Auth::guard('web')->login + session regenerate, Session 2 ship).
//   • Frontend calls auth.fetchMe() to populate the store (user,
//     permissions, entitled_modules, etc.).
//   • Then getDefaultRoute() picks the landing — HRM for HRM-entitled
//     tenants, launcher otherwise.
//
// On submit 422 with error_code (race — token went invalid between
// preview and accept, e.g. another tab accepted, admin cancelled, etc.):
//   • Switch the page to the invalid state with the new error_code.
//   • The form-level banner is for non-422 / non-error_code paths.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const token = computed<string>(() =>
    typeof route.params.token === 'string' ? route.params.token : '',
);

const previewQuery = useInvitationQuery(token);
const acceptMutation = useAcceptInvitationMutation(token);

const isLoading = computed<boolean>(() => previewQuery.isLoading.value);
const isError = computed<boolean>(() => previewQuery.isError.value);

// ─── Invalid-state detection ────────────────────────────────────────────────
// Both the preview AND the accept POST can return 422 with an
// error_code. The page transitions to invalid state on either.
// `invalidCode` is null when no invalid signal is present; set to a
// known InvitationErrorCode otherwise.
const invalidCode = ref<InvitationErrorCode | null>(null);

function extractErrorCode(err: unknown): InvitationErrorCode | null {
    if (!axios.isAxiosError(err)) return null;
    const status = err.response?.status;
    if (status !== 422) return null;
    const body = err.response?.data as { error_code?: string } | undefined;
    const code = body?.error_code;
    if (code === undefined) return null;
    // Only accept known codes (frozen-allowlist defence per §10.8). A
    // forged or drifted code falls through to null → generic error.
    if (INVITATION_ERROR_CODES.includes(code as InvitationErrorCode)) {
        return code as InvitationErrorCode;
    }
    return null;
}

// Watch the preview query's error to set invalidCode when the backend
// returns a known invalid-token reason. Done via computed so the
// transition is reactive.
const previewInvalidCode = computed<InvitationErrorCode | null>(() => {
    if (!previewQuery.isError.value) return null;
    return extractErrorCode(previewQuery.error.value);
});

// Combined invalid signal: preview returned an invalid code, OR the
// submit set invalidCode via the catch path.
const effectiveInvalidCode = computed<InvitationErrorCode | null>(() => {
    return invalidCode.value ?? previewInvalidCode.value;
});

const isGenericLoadError = computed<boolean>(() => {
    return isError.value && previewInvalidCode.value === null;
});

const preview = computed(() => previewQuery.data.value?.data ?? null);

// ─── Form ───────────────────────────────────────────────────────────────────
const { handleSubmit, setErrors, isSubmitting } = useForm<AcceptInvitationFormValues>({
    validationSchema: toTypedSchema(acceptInvitationSchema),
    initialValues: { password: '', name: '' },
});

// PrimeVue Password's inner field doesn't bind cleanly via the
// FormField scoped-slot pattern (its model-value type is the masked-
// reveal toggle's state, not the password value). Use the standalone-
// chrome useField pattern (per FormField docblock) — FormField still
// renders label + error chrome; Password is bound via the useField's
// value ref.
const { value: passwordValue } = useField<string>('password');

const formError = ref<string | null>(null);

const onSubmit = handleSubmit(async (vals) => {
    formError.value = null;
    try {
        await acceptMutation.mutateAsync({
            password: vals.password,
            name: vals.name?.trim() === '' ? null : (vals.name?.trim() ?? null),
        });

        // Auto-login per Q4. Backend set the Sanctum session cookie
        // inside the POST handler; fetchMe() picks it up.
        await auth.fetchMe();

        const target = getDefaultRoute({
            isSuperAdmin: auth.isSuperAdmin,
            entitledModules: auth.entitledModules,
            permissions: auth.permissions,
        });
        await router.push(target);
    } catch (e: unknown) {
        // Race-window invalid signal: token went invalid between
        // preview and accept (another tab accepted, admin cancelled,
        // expiry crossed). Switch the page to the invalid state.
        const code = extractErrorCode(e);
        if (code !== null) {
            invalidCode.value = code;
            return;
        }

        // Standard 422 with field errors → setErrors. Backend ships
        // arrays per field; first message per field per LoginPage
        // convention.
        if (axios.isAxiosError(e) && e.response?.status === 422) {
            const body = e.response.data as
                | { errors?: Record<string, string[]> }
                | undefined;
            if (body?.errors) {
                const fieldErrors: Record<string, string> = {};
                for (const [field, msgs] of Object.entries(body.errors)) {
                    if (msgs && msgs.length > 0) fieldErrors[field] = msgs[0];
                }
                setErrors(fieldErrors);
                return;
            }
        }

        formError.value = t('invitations.accept.errors.unknown');
    }
});

function formatExpiryDate(iso: string): string {
    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(iso));
}
</script>

<template>
    <div class="min-h-screen bg-surface-sunken">
        <!-- STATE 1: loading the preview -->
        <template v-if="isLoading">
            <div class="flex min-h-screen items-center justify-center">
                <LoadingState variant="detail" data-testid="accept-invitation-loading" />
            </div>
        </template>

        <!-- STATE 2: invalid (preview returned 422 with error_code OR
             submit raced) — render the corresponding InvitationInvalidPage
             variant -->
        <template v-else-if="effectiveInvalidCode">
            <InvitationInvalidPage :error-code="effectiveInvalidCode" />
        </template>

        <!-- STATE 3: error (non-422 network failure) -->
        <template v-else-if="isGenericLoadError">
            <div class="flex min-h-screen items-center justify-center px-4">
                <ErrorState
                    data-testid="accept-invitation-error"
                    @retry="() => void previewQuery.refetch()"
                />
            </div>
        </template>

        <!-- STATE 4: populated — preview + form -->
        <template v-else-if="preview">
            <div class="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
                <div class="rounded-lg border border-border-default bg-surface p-8 shadow-sm">
                    <h1
                        class="mb-2 text-xl font-semibold text-text-primary"
                        data-testid="accept-invitation-title"
                    >
                        {{ t('invitations.accept.title') }}
                    </h1>
                    <p class="mb-6 text-sm text-text-secondary">
                        {{ t('invitations.accept.intro') }}
                    </p>

                    <!-- Invitee context — tenant, role, inviter, email, expiry.
                         This is the Q4 transparency requirement: the
                         invitee sees WHAT they're accepting before they
                         enter a password. -->
                    <dl
                        class="mb-6 grid grid-cols-1 gap-3 rounded-md bg-surface-sunken p-4 text-sm"
                        data-testid="accept-invitation-preview"
                    >
                        <div class="grid grid-cols-3 gap-2">
                            <dt class="text-xs uppercase text-text-tertiary">
                                {{ t('invitations.accept.preview.email') }}
                            </dt>
                            <dd
                                class="col-span-2 text-text-primary"
                                data-testid="accept-invitation-preview-email"
                            >
                                {{ preview.email }}
                            </dd>
                        </div>
                        <div v-if="preview.tenant" class="grid grid-cols-3 gap-2">
                            <dt class="text-xs uppercase text-text-tertiary">
                                {{ t('invitations.accept.preview.tenant') }}
                            </dt>
                            <dd
                                class="col-span-2 text-text-primary"
                                data-testid="accept-invitation-preview-tenant"
                            >
                                {{ preview.tenant.name }}
                            </dd>
                        </div>
                        <div v-if="preview.role_name" class="grid grid-cols-3 gap-2">
                            <dt class="text-xs uppercase text-text-tertiary">
                                {{ t('invitations.accept.preview.role') }}
                            </dt>
                            <dd
                                class="col-span-2 text-text-primary"
                                data-testid="accept-invitation-preview-role"
                            >
                                {{ preview.role_name }}
                            </dd>
                        </div>
                        <div v-if="preview.invited_by_name" class="grid grid-cols-3 gap-2">
                            <dt class="text-xs uppercase text-text-tertiary">
                                {{ t('invitations.accept.preview.inviter') }}
                            </dt>
                            <dd
                                class="col-span-2 text-text-primary"
                                data-testid="accept-invitation-preview-inviter"
                            >
                                {{ preview.invited_by_name }}
                            </dd>
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            <dt class="text-xs uppercase text-text-tertiary">
                                {{ t('invitations.accept.preview.expires') }}
                            </dt>
                            <dd
                                class="col-span-2 text-text-primary"
                                data-testid="accept-invitation-preview-expires"
                            >
                                {{ formatExpiryDate(preview.expires_at) }}
                            </dd>
                        </div>
                    </dl>

                    <div
                        v-if="formError"
                        role="alert"
                        data-testid="accept-invitation-error-banner"
                        class="mb-4 rounded-md border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-text"
                    >
                        {{ formError }}
                    </div>

                    <form class="flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
                        <FormField
                            v-slot="{ field }"
                            name="name"
                            :label="t('invitations.accept.fields.name')"
                            :help="t('invitations.accept.fields.nameHelp')"
                        >
                            <InputText
                                v-bind="field"
                                autocomplete="name"
                                class="w-full"
                                data-testid="accept-invitation-name"
                            />
                        </FormField>

                        <FormField
                            name="password"
                            :label="t('invitations.accept.fields.password')"
                            :help="t('invitations.accept.fields.passwordHelp')"
                            required
                        >
                            <Password
                                v-model="passwordValue"
                                toggle-mask
                                :feedback="false"
                                input-class="w-full"
                                class="w-full"
                                input-id="accept-invitation-password"
                                data-testid="accept-invitation-password"
                                autocomplete="new-password"
                            />
                        </FormField>

                        <div class="mt-2 flex justify-end gap-2">
                            <Button
                                type="submit"
                                :label="t('invitations.accept.submit')"
                                :loading="isSubmitting || acceptMutation.isPending.value"
                                data-testid="accept-invitation-submit"
                            />
                        </div>
                    </form>
                </div>
            </div>
        </template>
    </div>
</template>
