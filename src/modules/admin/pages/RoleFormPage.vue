<script setup lang="ts">
import axios from 'axios';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
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

import PermissionPicker from '@/modules/admin/components/PermissionPicker.vue';
import RoleUpdateWarning from '@/modules/admin/components/RoleUpdateWarning.vue';
import {
    useAdminRoleQuery,
    useAdminRolesQuery,
    useCreateRoleMutation,
    useUpdateRoleMutation,
    usePermissionDescriptionsQuery,
} from '@/modules/admin/composables/useAdminRoles';
import {
    createRoleSchema,
    updateRoleSchema,
    type RoleFormValues,
} from '@/modules/admin/schemas/roleFormSchema';
import { ADMIN_ROUTES } from '@/modules/admin/routes';
import type { ApiErrorBody } from '@/modules/auth/types';
import type { BreadcrumbItem } from '@/shared/types/navigation';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// RoleFormPage — create + edit a custom role (Phase 2B Session 4).
//
// Two modes, single page. The router passes `id` for edit mode; create
// mode receives no id. Mode is derived from the prop.
//
// Reactive validation schema per §10.10:
//   activeSchema = computed(() => isEditMode ? updateRoleSchema : createRoleSchema)
//   useForm({ validationSchema: computed(() => toTypedSchema(activeSchema.value)) })
//
// SEPARATE schemas (not a discriminated union with synthetic
// discriminator). The TenantFormPage and EmployeeFormPage established
// the pattern; the synthetic-discriminator alternative breaks because
// VeeValidate's setValues doesn't propagate to unregistered fields.
//
// SYSTEM-ROLE EDIT REDIRECT (Phase 2B Q15 + Session 4 deliberate #3):
// edit mode loads the role row; if is_system=true, the page redirects
// to the detail view (NOT a disabled form). Test pinned. Future Claude
// Code session must not "fix" this by showing a disabled form — that
// would be wrong per the locked decision.
//
// SOFT WARNING AT 10 CUSTOM ROLES (Phase 2B Q8 + Session 4 deliberate
// #4): create mode renders an inline notice when the tenant already has
// 10+ custom roles. NOT a hard block — admin can still create. Count
// comes from the existing role-list query (kind=custom); no new endpoint.
//
// UPDATE WARNING DIALOG: edit-mode submit computes the diff of permission
// REMOVALS. If non-empty, opens RoleUpdateWarning before saving. The
// dialog reads the impact endpoint to surface affected_users_count
// (over-warn semantic per backend RoleImpactController docblock).
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    /** Present in edit mode; absent in create mode. */
    id?: number;
}
const props = defineProps<Props>();

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const auth = useAuthStore();

const isEditMode = computed<boolean>(
    () => props.id !== undefined && props.id > 0,
);
const isCreateMode = computed<boolean>(() => !isEditMode.value);

// Required permission depends on mode. The route also has its own
// meta.permission gate; this is a defense-in-depth UI check.
const canPerform = computed<boolean>(() =>
    isCreateMode.value ? auth.can('roles.create') : auth.can('roles.update'),
);

// ─── Data queries ──────────────────────────────────────────────────────────
const roleId = computed<number>(() => props.id ?? 0);
const roleQuery = useAdminRoleQuery(roleId);
const descriptionsQuery = usePermissionDescriptionsQuery();
// Soft-warning count source. Only used in create mode; the query
// runs anyway (small payload) so the count is available on mount.
const customRolesListQuery = useAdminRolesQuery(() => ({ kind: 'custom', per_page: 1 }));

const isLoading = computed<boolean>(() => {
    if (isCreateMode.value) {
        return descriptionsQuery.isLoading.value || customRolesListQuery.isLoading.value;
    }
    return roleQuery.isLoading.value || descriptionsQuery.isLoading.value;
});

const isNotFound = computed<boolean>(() => {
    if (!isEditMode.value) return false;
    if (!roleQuery.isError.value) return false;
    const err = roleQuery.error.value;
    if (axios.isAxiosError(err)) return err.response?.status === 404;
    return false;
});

const isGenericLoadError = computed<boolean>(() => {
    if (descriptionsQuery.isError.value) return true;
    if (isEditMode.value && roleQuery.isError.value && !isNotFound.value) return true;
    return false;
});

// ─── System-role redirect ──────────────────────────────────────────────────
// Edit-mode only. Watch the role row; when it resolves and is_system=true,
// replace the route to the detail page AND set isSystemRedirecting so the
// template skips rendering the form during the brief window between the
// `router.replace` call and the component unmount. Per locked decision Q15
// — system roles are immutable; the form must NEVER render for them.
const isSystemRedirecting = computed<boolean>(() => {
    if (!isEditMode.value) return false;
    return roleQuery.data.value?.data?.is_system === true;
});

watch(
    () => roleQuery.data.value?.data,
    (role) => {
        if (!isEditMode.value) return;
        if (!role) return;
        if (role.is_system) {
            void router.replace({
                name: ADMIN_ROUTES.ROLE_DETAIL,
                params: { id: role.id },
            });
        }
    },
    { immediate: true },
);

// ─── Reactive schema (§10.10) ──────────────────────────────────────────────
const activeSchema = computed(() =>
    isCreateMode.value ? createRoleSchema : updateRoleSchema,
);

const { handleSubmit, setErrors, setValues, values, isSubmitting } =
    useForm<RoleFormValues>({
        validationSchema: computed(() => toTypedSchema(activeSchema.value)),
        initialValues: {
            name: '',
            description: null,
            permission_ids: [],
        },
    });

// ─── Original permission set tracking ──────────────────────────────────────
// Edit mode records the role's ORIGINAL permission ids on first load so
// we can compute the diff at submit time. Create mode has no original.
const originalPermissionIds = ref<number[]>([]);

watch(
    () => roleQuery.data.value?.data,
    (role) => {
        if (!isEditMode.value) return;
        if (!role) return;
        if (role.is_system) return; // system rows redirect; don't seed
        const ids = (role.permissions ?? []).map((p) => p.id);
        originalPermissionIds.value = ids;
        setValues({
            name: role.name,
            description: role.description ?? null,
            permission_ids: [...ids],
        });
    },
    { immediate: true },
);

// ─── Permission picker model ───────────────────────────────────────────────
const permissionIdsModel = computed<number[]>(
    () => values.permission_ids ?? [],
);
function onPermissionIdsChange(next: number[]): void {
    setValues({ ...values, permission_ids: next });
}

// ─── Permission diff for the update warning ────────────────────────────────
// Removed permission NAMES — the impact endpoint accepts names. We
// reverse-lookup names from IDs using the descriptions catalog.
const removedPermissionNames = computed<string[]>(() => {
    if (isCreateMode.value) return [];
    const idMap = descriptionsQuery.data.value?.data.permission_ids ?? {};
    // name → id map; we need id → name. Build inline (small map).
    const idToName = new Map<number, string>();
    for (const [name, id] of Object.entries(idMap)) idToName.set(id, name);

    const currentSet = new Set(values.permission_ids ?? []);
    const removed: string[] = [];
    for (const id of originalPermissionIds.value) {
        if (!currentSet.has(id)) {
            const n = idToName.get(id);
            if (n) removed.push(n);
        }
    }
    return removed;
});

// ─── Soft-warning at 10 custom roles ───────────────────────────────────────
const customRoleCount = computed<number>(
    () => customRolesListQuery.data.value?.meta.total ?? 0,
);
const showSoftWarning = computed<boolean>(
    () => isCreateMode.value && customRoleCount.value >= 10,
);

// ─── Update-warning dialog state ───────────────────────────────────────────
const isUpdateWarningOpen = ref(false);
const formError = ref<string | null>(null);

function isAxiosErr(e: unknown): e is import('axios').AxiosError<ApiErrorBody> {
    return axios.isAxiosError(e);
}

const createMutation = useCreateRoleMutation();
const updateMutation = useUpdateRoleMutation();

async function performCreate(): Promise<void> {
    if (isCreateMode.value === false) return;
    formError.value = null;
    try {
        const payload = {
            name: (values.name ?? '').trim(),
            description: values.description?.trim() || null,
            permission_ids: values.permission_ids ?? [],
        };
        const res = await createMutation.mutateAsync(payload);
        toast.add({
            severity: 'success',
            summary: t('admin.roles.toast.created'),
            life: 3000,
        });
        void router.push({
            name: ADMIN_ROUTES.ROLE_DETAIL,
            params: { id: res.data.id },
        });
    } catch (e: unknown) {
        handleSubmitError(e);
    }
}

async function performUpdate(): Promise<void> {
    if (!props.id) return;
    formError.value = null;
    try {
        const payload = {
            name: (values.name ?? '').trim(),
            description: values.description?.trim() || null,
            permission_ids: values.permission_ids ?? [],
        };
        await updateMutation.mutateAsync({ id: props.id, payload });
        toast.add({
            severity: 'success',
            summary: t('admin.roles.toast.updated'),
            life: 3000,
        });
        void router.push({
            name: ADMIN_ROUTES.ROLE_DETAIL,
            params: { id: props.id },
        });
    } catch (e: unknown) {
        handleSubmitError(e);
    }
}

function handleSubmitError(e: unknown): void {
    if (!isAxiosErr(e) || !e.response) {
        formError.value = t('admin.roles.errors.unknown');
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

    if (status === 403) {
        formError.value = t('admin.roles.errors.forbidden');
        return;
    }

    formError.value = t('admin.roles.errors.unknown');
}

const onSubmit = handleSubmit(async () => {
    if (isCreateMode.value) {
        await performCreate();
        return;
    }
    // Edit mode: if permissions are being removed, open the warning
    // first. Otherwise save directly.
    if (removedPermissionNames.value.length > 0) {
        isUpdateWarningOpen.value = true;
        return;
    }
    await performUpdate();
});

function onWarningAccept(): void {
    void performUpdate();
}

function onCancel(): void {
    if (isEditMode.value && props.id) {
        void router.push({
            name: ADMIN_ROUTES.ROLE_DETAIL,
            params: { id: props.id },
        });
    } else {
        void router.push({ name: ADMIN_ROUTES.ROLE_LIST });
    }
}

const pageTitle = computed<string>(() => {
    if (isCreateMode.value) return t('admin.roles.create.title');
    return values.name ?? t('admin.roles.edit.title');
});

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const crumbs: BreadcrumbItem[] = [
        {
            label: t('admin.roles.list.breadcrumb'),
            to: { name: ADMIN_ROUTES.ROLE_LIST },
        },
    ];
    if (isEditMode.value && props.id) {
        crumbs.push({
            label: roleQuery.data.value?.data.label ?? t('admin.roles.detail.breadcrumb'),
            to: { name: ADMIN_ROUTES.ROLE_DETAIL, params: { id: String(props.id) } },
        });
        crumbs.push({ label: t('admin.roles.edit.breadcrumb') });
    } else {
        crumbs.push({ label: t('admin.roles.create.breadcrumb') });
    }
    return crumbs;
});
</script>

<template>
    <PageLayout width="narrow">
        <template v-if="!canPerform">
            <PermissionDeniedPage
                data-testid="role-form-permission-denied"
                :resource="t('admin.roles.list.title')"
            />
        </template>

        <template v-else-if="isLoading">
            <LoadingState
                variant="detail"
                data-testid="role-form-loading"
            />
        </template>

        <template v-else-if="isNotFound">
            <NotFoundPage data-testid="role-form-not-found" />
        </template>

        <template v-else-if="isGenericLoadError">
            <ErrorState
                data-testid="role-form-error"
                @retry="
                    () => {
                        void roleQuery.refetch();
                        void descriptionsQuery.refetch();
                    }
                "
            />
        </template>

        <!-- System-role guard: skip the populated branch entirely while
             the redirect is in flight. Otherwise the form would briefly
             render with the system role's name visible before the route
             change unmounts the component (test surface caught this). -->
        <template v-else-if="isSystemRedirecting">
            <LoadingState
                variant="detail"
                data-testid="role-form-redirecting"
            />
        </template>

        <template v-else>
            <PageHeader
                :title="pageTitle"
                :breadcrumbs="breadcrumbs"
            />

            <p class="mb-4 text-sm text-text-secondary">
                {{ isCreateMode ? t('admin.roles.create.intro') : t('admin.roles.edit.intro') }}
            </p>

            <!-- Soft warning at 10 custom roles (Phase 2B Q8). NOT a hard
                 block — just an inline notice. -->
            <div
                v-if="showSoftWarning"
                class="mb-4 rounded-md border border-warning-border bg-warning-bg-subtle px-4 py-3 text-sm text-warning-text"
                data-testid="role-form-soft-warning"
            >
                {{ t('admin.roles.create.softWarning', { count: customRoleCount }) }}
            </div>

            <form @submit.prevent="onSubmit">
                <CardSection :title="t('admin.roles.form.sections.basics')">
                    <FormField
                        name="name"
                        :label="t('admin.roles.form.fields.name')"
                        :required="true"
                        :help="t('admin.roles.form.fields.nameHelp')"
                    >
                        <template #default="{ field }">
                            <InputText
                                v-bind="field"
                                data-testid="role-form-name"
                                class="w-full"
                            />
                        </template>
                    </FormField>

                    <FormField
                        name="description"
                        :label="t('admin.roles.form.fields.description')"
                        :help="t('admin.roles.form.fields.descriptionHelp')"
                    >
                        <template #default="{ field }">
                            <Textarea
                                v-bind="field"
                                rows="3"
                                data-testid="role-form-description"
                                class="w-full"
                            />
                        </template>
                    </FormField>
                </CardSection>

                <CardSection
                    :title="t('admin.roles.form.sections.permissions')"
                    class="mt-4"
                >
                    <PermissionPicker
                        :model-value="permissionIdsModel"
                        :disabled="isSubmitting"
                        data-testid="role-form-permission-picker"
                        @update:model-value="onPermissionIdsChange"
                    />
                </CardSection>

                <div
                    v-if="formError"
                    class="mt-4 rounded-md border border-danger-border bg-danger-bg-subtle px-4 py-3 text-sm text-danger-text"
                    data-testid="role-form-error-banner"
                >
                    {{ formError }}
                </div>

                <FormActions
                    :submit-label="
                        isCreateMode
                            ? t('admin.roles.actions.create')
                            : t('admin.roles.actions.save')
                    "
                    :cancel-label="t('admin.roles.actions.cancel')"
                    :loading="isSubmitting"
                    @submit="onSubmit"
                    @cancel="onCancel"
                />
            </form>

            <RoleUpdateWarning
                v-if="isEditMode && props.id"
                :open="isUpdateWarningOpen"
                :role-id="props.id"
                :role-name="values.name ?? ''"
                :removed-permissions="removedPermissionNames"
                @update:open="(v: boolean) => (isUpdateWarningOpen = v)"
                @accept="onWarningAccept"
            />
        </template>
    </PageLayout>
</template>
