<script setup lang="ts">
import axios from 'axios';
import { computed, ref, watch } from 'vue';
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
import NotFoundPage from '@/shared/components/state/NotFoundPage.vue';
import PermissionDeniedPage from '@/shared/components/state/PermissionDeniedPage.vue';
import FormField from '@/shared/components/form/FormField.vue';
import FormActions from '@/shared/components/form/FormActions.vue';

import {
    useAdminUserQuery,
    useRoleOptionsQuery,
    useUpdateAdminUserMutation,
} from '@/modules/admin/composables/useAdminUsers';
import {
    editUserSchema,
    type EditUserFormValues,
} from '@/modules/admin/schemas/editUserSchema';
import { ADMIN_ROUTES } from '@/modules/admin/routes';
import type { ApiErrorBody } from '@/modules/auth/types';
import type { BreadcrumbItem } from '@/shared/types/navigation';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// EditUserPage — Phase 2A Session 4.
//
// 5-state matrix at the PAGE level (§10.18):
//   1. permission-denied — lacks users.update
//   2. loading           — user query OR role options query in-flight
//   3. 404               — target user is in another tenant / deleted
//   4. error             — generic load failure
//   5. populated         — form rendered with the user's current name + role
//
// Pre-fill via the `{ immediate: true }` watch pattern with refs declared
// BEFORE the watch (per §10.16 — declaration order matters under
// warm-cache navigate paths). Edit scope is narrow: name + role only.
// Status transitions go through dedicated /disable etc. endpoints.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    id?: number;
}
const props = defineProps<Props>();

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const auth = useAuthStore();

const canEdit = computed<boolean>(() => auth.can('users.update'));

const userId = computed<number>(() => props.id ?? 0);

const userQuery = useAdminUserQuery(userId);
const roleOptionsQuery = useRoleOptionsQuery();
const updateMutation = useUpdateAdminUserMutation();

const isLoading = computed<boolean>(
    () => userQuery.isLoading.value || roleOptionsQuery.isLoading.value,
);
const isUserError = computed<boolean>(() => userQuery.isError.value);
const isRolesError = computed<boolean>(() => roleOptionsQuery.isError.value);

const isNotFound = computed<boolean>(() => {
    if (!isUserError.value) return false;
    const err = userQuery.error.value;
    if (axios.isAxiosError(err)) return err.response?.status === 404;
    return false;
});
const isGenericLoadError = computed<boolean>(
    () => (isUserError.value && !isNotFound.value) || isRolesError.value,
);

const userData = computed(() => userQuery.data.value?.data ?? null);
const roleOptions = computed(() => roleOptionsQuery.data.value?.data ?? []);

const { handleSubmit, setErrors, setValues, isSubmitting } = useForm<EditUserFormValues>({
    validationSchema: toTypedSchema(editUserSchema),
    initialValues: { name: '', role_id: 0 },
});

// Standalone-chrome useField for the role_id number (see InviteUserForm
// for the same pattern's rationale — FormField slot is string-only).
const {
    value: roleIdValue,
    handleChange: handleRoleIdChange,
    handleBlur: handleRoleIdBlur,
} = useField<number>('role_id');

const formError = ref<string | null>(null);

// Pre-fill once the user query resolves. `immediate: true` so warm-cache
// navigate-from-detail mounts seed the form synchronously per §10.11.
// The refs the body touches (setValues only, no direct ref assignment)
// are part of useForm's API — no TDZ risk per §10.16.
watch(
    () => userData.value,
    (u) => {
        if (!u) return;
        setValues({
            name: u.name,
            role_id: u.role?.id ?? 0,
        });
    },
    { immediate: true },
);

function isAxiosErr(e: unknown): e is import('axios').AxiosError<ApiErrorBody> {
    return axios.isAxiosError(e);
}

const onSubmit = handleSubmit(async (vals) => {
    if (!props.id) return;
    formError.value = null;

    try {
        await updateMutation.mutateAsync({
            id: props.id,
            payload: {
                name: vals.name?.trim(),
                role_id: vals.role_id !== 0 ? vals.role_id : undefined,
            },
        });
        toast.add({
            severity: 'success',
            summary: t('admin.users.edit.toast.updated'),
            life: 3000,
        });
        void router.push({
            name: ADMIN_ROUTES.USER_DETAIL,
            params: { id: props.id },
        });
    } catch (e: unknown) {
        if (!isAxiosErr(e) || !e.response) {
            formError.value = t('admin.users.edit.errors.unknown');
            return;
        }
        const status = e.response.status;
        const body = e.response.data;

        if (status === 422 && body?.errors) {
            const fieldErrors: Record<string, string> = {};
            for (const [field, msgs] of Object.entries(body.errors)) {
                if (msgs && msgs.length > 0) fieldErrors[field] = msgs[0];
            }
            setErrors(fieldErrors);
            return;
        }

        if (status === 403 || status === 404) {
            formError.value = t('admin.users.edit.errors.forbidden');
            return;
        }

        formError.value = t('admin.users.edit.errors.unknown');
    }
});

function onCancel(): void {
    if (props.id) {
        void router.push({
            name: ADMIN_ROUTES.USER_DETAIL,
            params: { id: props.id },
        });
    } else {
        void router.push({ name: ADMIN_ROUTES.USER_LIST });
    }
}

const pageTitle = computed<string>(() =>
    userData.value?.name ?? t('admin.users.edit.title'),
);

const breadcrumbs = computed<BreadcrumbItem[]>(() => [
    {
        label: t('admin.users.list.breadcrumb'),
        to: { name: ADMIN_ROUTES.USER_LIST },
    },
    {
        label: userData.value?.name ?? t('admin.users.detail.breadcrumb'),
        to: props.id
            ? { name: ADMIN_ROUTES.USER_DETAIL, params: { id: String(props.id) } }
            : { name: ADMIN_ROUTES.USER_LIST },
    },
    { label: t('admin.users.edit.breadcrumb') },
]);
</script>

<template>
    <PageLayout width="narrow">
        <template v-if="!canEdit">
            <PermissionDeniedPage
                data-testid="edit-user-permission-denied"
                :resource="t('admin.users.edit.title')"
            />
        </template>

        <template v-else-if="isLoading">
            <LoadingState variant="detail" data-testid="edit-user-loading" />
        </template>

        <template v-else-if="isNotFound">
            <NotFoundPage data-testid="edit-user-not-found" />
        </template>

        <template v-else-if="isGenericLoadError">
            <ErrorState
                data-testid="edit-user-error"
                @retry="
                    () => {
                        void userQuery.refetch();
                        void roleOptionsQuery.refetch();
                    }
                "
            />
        </template>

        <template v-else-if="userData">
            <PageHeader :title="pageTitle" :breadcrumbs="breadcrumbs" />

            <CardSection>
                <div
                    v-if="formError"
                    role="alert"
                    data-testid="edit-user-form-error-banner"
                    class="mb-4 rounded-md border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-text"
                >
                    {{ formError }}
                </div>

                <form class="flex flex-col gap-5" novalidate @submit.prevent="onSubmit">
                    <FormField
                        v-slot="{ field }"
                        name="name"
                        :label="t('admin.users.edit.fields.name')"
                        required
                    >
                        <InputText
                            v-bind="field"
                            autocomplete="name"
                            class="w-full"
                            data-testid="edit-user-name"
                        />
                    </FormField>

                    <FormField
                        name="role_id"
                        :label="t('admin.users.edit.fields.role')"
                        :help="t('admin.users.edit.fields.roleHelp')"
                    >
                        <Select
                            :model-value="roleIdValue"
                            :options="roleOptions"
                            option-label="name"
                            option-value="id"
                            class="w-full"
                            data-testid="edit-user-role"
                            @update:model-value="handleRoleIdChange"
                            @blur="handleRoleIdBlur"
                        />
                    </FormField>

                    <FormActions
                        :submit-label="t('admin.users.edit.submit')"
                        :loading="isSubmitting || updateMutation.isPending.value"
                        @submit="onSubmit"
                        @cancel="onCancel"
                    />
                </form>
            </CardSection>
        </template>
    </PageLayout>
</template>
