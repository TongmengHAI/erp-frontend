<script setup lang="ts">
import axios from 'axios';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useField, useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { useToast } from 'primevue/usetoast';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import CardSection from '@/shared/components/layout/CardSection.vue';
import LoadingState from '@/shared/components/state/LoadingState.vue';
import ErrorState from '@/shared/components/state/ErrorState.vue';
import PermissionDeniedPage from '@/shared/components/state/PermissionDeniedPage.vue';
import FormField from '@/shared/components/form/FormField.vue';
import FormActions from '@/shared/components/form/FormActions.vue';

import {
    useInviteUserMutation,
    useRoleOptionsQuery,
} from '@/modules/admin/composables/useAdminUsers';
import {
    inviteUserSchema,
    type InviteUserFormValues,
} from '@/modules/admin/schemas/inviteUserSchema';
import { ADMIN_ROUTES } from '@/modules/admin/routes';
import type { ApiErrorBody } from '@/modules/auth/types';
import type { BreadcrumbItem } from '@/shared/types/navigation';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// InviteUserForm — Phase 2A Session 4.
//
// State matrix at the PAGE level (§10.18). The form is a composite — it
// fetches role options before it can render its Select. State order:
//
//   1. permission-denied — user lacks users.invite
//   2. loading           — role options query is in-flight
//   3. error             — role options query failed; form can't render
//                          without a role list
//   4. populated         — form renders, ready for submit
//
// There's no "empty" state for the form — the role options query
// returning [] would be a backend bug (the framework seeder always
// produces tenant_admin/accountant/viewer); the page would render
// the form anyway, the Select would have no options.
//
// 422 handling: per Q10 Option A from the planning conversation, the
// backend returns `error_code` on certain 422s — email_globally_registered
// and active_invitation_exists. The handler branches on error_code and
// surfaces friendly copy via setErrors. Other 422 paths use the standard
// errors.{field}[0] → setErrors mapping.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const auth = useAuthStore();

const canInvite = computed<boolean>(() => auth.can('users.invite'));

const roleOptionsQuery = useRoleOptionsQuery();
const inviteMutation = useInviteUserMutation();

const isRolesLoading = computed<boolean>(() => roleOptionsQuery.isLoading.value);
const isRolesError = computed<boolean>(() => roleOptionsQuery.isError.value);
const roleOptions = computed(() => roleOptionsQuery.data.value?.data ?? []);

const { handleSubmit, setErrors, isSubmitting } = useForm<InviteUserFormValues>({
    validationSchema: toTypedSchema(inviteUserSchema),
    initialValues: {
        email: '',
        name: '',
        role_id: 0,
    },
});

// role_id is a number — outside FormField's string-only slot type.
// Use the standalone-chrome useField pattern (per FormField docblock):
// FormField provides the label + error chrome; the Select is bound
// directly via useField's value/handleChange/handleBlur.
const {
    value: roleIdValue,
    handleChange: handleRoleIdChange,
    handleBlur: handleRoleIdBlur,
} = useField<number>('role_id');

const formError = ref<string | null>(null);

function isAxiosErr(e: unknown): e is import('axios').AxiosError<ApiErrorBody> {
    return axios.isAxiosError(e);
}

const onSubmit = handleSubmit(async (vals) => {
    formError.value = null;
    try {
        const res = await inviteMutation.mutateAsync({
            email: vals.email.trim().toLowerCase(),
            name: vals.name?.trim() === '' ? null : (vals.name?.trim() ?? null),
            role_id: vals.role_id,
        });
        toast.add({
            severity: 'success',
            summary: t('admin.users.invite.toast.success', { email: res.data.email }),
            life: 4000,
        });
        void router.push({ name: ADMIN_ROUTES.USER_LIST });
    } catch (e: unknown) {
        if (!isAxiosErr(e) || !e.response) {
            formError.value = t('admin.users.invite.errors.unknown');
            return;
        }
        const status = e.response.status;
        const body = e.response.data as ApiErrorBody & {
            error_code?: string;
            existing_invitation_id?: number;
        };

        if (status === 422) {
            // Q10 Option A — email_globally_registered.
            if (body.error_code === 'email_globally_registered') {
                setErrors({
                    email: t('admin.users.invite.errors.email_globally_registered'),
                });
                return;
            }
            // Q11 — active_invitation_exists.
            if (body.error_code === 'active_invitation_exists') {
                setErrors({
                    email: t('admin.users.invite.errors.active_invitation_exists'),
                });
                return;
            }

            // Standard 422 — backend ships arrays per field; first
            // message per field, same convention as LoginPage's spike.
            if (body.errors) {
                const fieldErrors: Record<string, string> = {};
                for (const [field, msgs] of Object.entries(body.errors)) {
                    if (msgs && msgs.length > 0) fieldErrors[field] = msgs[0];
                }
                setErrors(fieldErrors);
                return;
            }
        }

        if (status === 403 || status === 404) {
            formError.value = t('admin.users.invite.errors.forbidden');
            return;
        }

        formError.value = t('admin.users.invite.errors.unknown');
    }
});

function onCancel(): void {
    void router.push({ name: ADMIN_ROUTES.USER_LIST });
}

const breadcrumbs = computed<BreadcrumbItem[]>(() => [
    {
        label: t('admin.users.list.breadcrumb'),
        to: { name: ADMIN_ROUTES.USER_LIST },
    },
    { label: t('admin.users.invite.breadcrumb') },
]);
</script>

<template>
    <PageLayout width="narrow">
        <!-- STATE 1: permission-denied -->
        <template v-if="!canInvite">
            <PermissionDeniedPage
                data-testid="invite-user-permission-denied"
                :resource="t('admin.users.invite.title')"
            />
        </template>

        <!-- STATE 2: loading role options -->
        <template v-else-if="isRolesLoading">
            <PageHeader
                :title="t('admin.users.invite.title')"
                :breadcrumbs="breadcrumbs"
            />
            <LoadingState variant="detail" data-testid="invite-user-loading" />
        </template>

        <!-- STATE 3: role options error -->
        <template v-else-if="isRolesError">
            <PageHeader
                :title="t('admin.users.invite.title')"
                :breadcrumbs="breadcrumbs"
            />
            <ErrorState
                data-testid="invite-user-roles-error"
                :description="t('admin.users.invite.roleOptions.errorFallback')"
                @retry="() => void roleOptionsQuery.refetch()"
            />
        </template>

        <!-- STATE 4: populated (form ready) -->
        <template v-else>
            <PageHeader
                :title="t('admin.users.invite.title')"
                :breadcrumbs="breadcrumbs"
            />

            <CardSection>
                <p class="mb-4 text-sm text-text-secondary">
                    {{ t('admin.users.invite.intro') }}
                </p>

                <div
                    v-if="formError"
                    role="alert"
                    data-testid="invite-user-form-error-banner"
                    class="mb-4 rounded-md border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-text"
                >
                    {{ formError }}
                </div>

                <form class="flex flex-col gap-5" novalidate @submit.prevent="onSubmit">
                    <FormField
                        v-slot="{ field }"
                        name="email"
                        :label="t('admin.users.invite.fields.email')"
                        :help="t('admin.users.invite.fields.emailHelp')"
                        required
                    >
                        <InputText
                            v-bind="field"
                            type="email"
                            autocomplete="email"
                            class="w-full"
                            data-testid="invite-user-email"
                        />
                    </FormField>

                    <FormField
                        v-slot="{ field }"
                        name="name"
                        :label="t('admin.users.invite.fields.name')"
                        :help="t('admin.users.invite.fields.nameHelp')"
                    >
                        <InputText
                            v-bind="field"
                            autocomplete="name"
                            class="w-full"
                            data-testid="invite-user-name"
                        />
                    </FormField>

                    <FormField
                        name="role_id"
                        :label="t('admin.users.invite.fields.role')"
                        :help="t('admin.users.invite.fields.roleHelp')"
                        required
                    >
                        <Select
                            :model-value="roleIdValue"
                            :options="roleOptions"
                            option-label="name"
                            option-value="id"
                            class="w-full"
                            data-testid="invite-user-role"
                            @update:model-value="handleRoleIdChange"
                            @blur="handleRoleIdBlur"
                        />
                    </FormField>

                    <FormActions
                        :submit-label="t('admin.users.invite.submit')"
                        :loading="isSubmitting || inviteMutation.isPending.value"
                        @submit="onSubmit"
                        @cancel="onCancel"
                    />
                </form>
            </CardSection>
        </template>
    </PageLayout>
</template>
