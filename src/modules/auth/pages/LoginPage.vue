<script setup lang="ts">
import axios from 'axios';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useField, useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';

import FormField from '@/shared/components/form/FormField.vue';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import type { ApiErrorBody } from '@/modules/auth/types';

// ─────────────────────────────────────────────────────────────────────────────
// LoginPage — email + password, Sanctum cookie auth.
//
// Error UX (F3 decision E):
//   422 → setErrors(field→messages) via VeeValidate
//   401 → form-level banner "Invalid email or password"
//   429 → form-level banner with Retry-After seconds
//   *   → generic banner "Something went wrong"
//
// The page renders its own centered layout — AppShell isn't mounted yet
// (F4) and login is one of the few routes that should always be visible
// regardless of shell state.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const loginSchema = toTypedSchema(
    z.object({
        email: z.string().min(1).email(),
        password: z.string().min(1),
    }),
);

const { handleSubmit, setErrors, isSubmitting } = useForm({
    validationSchema: loginSchema,
    initialValues: { email: '', password: '' },
});

// VeeValidate doesn't auto-bind plain inputs in v4 — we register each
// field's value ref via useField() and v-model it onto the input. The
// FormField wrapper (F2b) still owns label + error rendering via its own
// useField call for errorMessage. Two useField calls per field is the
// canonical pattern; the imperative API is by-design ref-stable.
const { value: email } = useField<string>('email');
const { value: password } = useField<string>('password');

const formError = ref<string | null>(null);

function isAxiosError(e: unknown): e is import('axios').AxiosError<ApiErrorBody> {
    return axios.isAxiosError(e);
}

const onSubmit = handleSubmit(async (values) => {
    formError.value = null;
    try {
        await auth.login({
            email: values.email as string,
            password: values.password as string,
        });
        // Honor ?redirect=<encoded path> when present; default to /.
        const redirect = (route.query.redirect as string | undefined) || '/';
        await router.push(redirect);
    } catch (e: unknown) {
        if (!isAxiosError(e) || !e.response) {
            formError.value = t('auth.login.errors.unknown');
            return;
        }
        const status = e.response.status;
        const body = e.response.data;

        if (status === 422 && body?.errors) {
            // VeeValidate expects single-string per field; backend sends
            // arrays. Take the first message for each.
            const fieldErrors: Record<string, string> = {};
            for (const [field, msgs] of Object.entries(body.errors)) {
                if (msgs && msgs.length > 0) fieldErrors[field] = msgs[0];
            }
            setErrors(fieldErrors);
            return;
        }

        if (status === 401) {
            formError.value = t('auth.login.errors.invalidCredentials');
            return;
        }

        if (status === 429) {
            const retryAfter = Number(e.response.headers?.['retry-after'] ?? 60);
            formError.value = t('auth.login.errors.rateLimited', { seconds: retryAfter });
            return;
        }

        formError.value = t('auth.login.errors.unknown');
    }
});
</script>

<template>
    <main
        class="login-page flex min-h-screen items-center justify-center bg-surface-sunken px-4"
    >
        <div class="w-full max-w-sm rounded-lg border border-border-default bg-surface p-8 shadow-sm">
            <header class="mb-6">
                <h1 class="text-2xl font-semibold text-text-primary">
                    {{ t('auth.login.title') }}
                </h1>
                <p class="mt-1 text-sm text-text-secondary">
                    {{ t('auth.login.subtitle') }}
                </p>
            </header>

            <div
                v-if="formError"
                role="alert"
                data-testid="login-form-error"
                class="mb-4 rounded-md border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-text"
            >
                {{ formError }}
            </div>

            <form class="flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
                <FormField name="email" :label="t('auth.login.fields.email')" required>
                    <InputText
                        v-model="email"
                        name="email"
                        type="email"
                        autocomplete="username"
                        class="w-full"
                        data-testid="login-email"
                    />
                </FormField>

                <FormField name="password" :label="t('auth.login.fields.password')" required>
                    <Password
                        v-model="password"
                        name="password"
                        :feedback="false"
                        toggle-mask
                        autocomplete="current-password"
                        class="w-full"
                        :input-class="'w-full'"
                        data-testid="login-password"
                    />
                </FormField>

                <Button
                    type="submit"
                    :label="isSubmitting ? t('auth.login.submitting') : t('auth.login.submit')"
                    :loading="isSubmitting"
                    :disabled="isSubmitting"
                    class="mt-2"
                    data-testid="login-submit"
                />
            </form>
        </div>
    </main>
</template>
