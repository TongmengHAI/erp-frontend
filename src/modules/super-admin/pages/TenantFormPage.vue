<script setup lang="ts">
import axios from 'axios';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useForm } from 'vee-validate';
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
import FormField from '@/shared/components/form/FormField.vue';
import FormActions from '@/shared/components/form/FormActions.vue';
import InitialAdminPasswordBanner from '@/modules/super-admin/components/InitialAdminPasswordBanner.vue';
import {
    useCreateTenant,
    useTenantQuery,
    useUpdateTenant,
} from '@/modules/super-admin/composables/useTenants';
import {
    tenantCreateSchema,
    tenantEditSchema,
} from '@/modules/super-admin/schemas/tenantFormSchema';
import { SUPER_ADMIN_ROUTES } from '@/modules/super-admin/routes';
import { slugify } from '@/modules/super-admin/utils/slugify';
import type { ApiErrorBody } from '@/modules/auth/types';
import type { Tenant } from '@/modules/super-admin/types/tenant';
import type { BreadcrumbItem } from '@/shared/types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// TenantFormPage — single component, two modes (create + edit) driven
// by route name. Per §10.10 the schema selection is reactive — two
// distinct Zod schemas (tenantCreateSchema + tenantEditSchema)
// selected via `validationSchema: computed(() => toTypedSchema(...))`.
// NOT a discriminated union on a synthetic field — see the HRM
// Settings slice Session 3 commit for why that pattern doesn't work
// with VeeValidate.
//
// Create mode renders THREE sections:
//   1. Tenant profile (slug auto-populated from name; manual edit
//      stops auto-populate, per Session 6 plan tightening #4)
//   2. Default company (same slug behaviour as the tenant slug)
//   3. Initial admin (name + email)
// On 201 the response carries a one-time `initial_admin_password`.
// The InitialAdminPasswordBanner displays it; on acknowledgement the
// banner unmounts and the password is gone from the SPA (no re-fetch
// path; future resets via the standard forgot-password flow).
//
// Edit mode renders sections 1 + a status select (active/suspended;
// archived is out of scope per the v1 SA UX). NO company section, NO
// initial admin section — those are fixed at create time.
//
// Slug-from-name affordance: a `slugManuallyEdited` flag tracks
// whether the user has touched the slug field. Once true, name
// changes no longer clobber the slug — otherwise typing in the name
// field would silently overwrite a manually-chosen slug.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    id?: number;
}
const props = defineProps<Props>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();

type Mode = 'create' | 'edit';

const mode = computed<Mode>(() =>
    route.name === SUPER_ADMIN_ROUTES.TENANT_EDIT ? 'edit' : 'create',
);
const isEditMode = computed<boolean>(() => mode.value === 'edit');

// ─── Edit-mode data load ────────────────────────────────────────────────────
const {
    data: editData,
    isLoading: isLoadingEdit,
    isError: isEditError,
    error: editError,
} = useTenantQuery(() => props.id ?? 0);

const isNotFound = computed<boolean>(() => {
    if (!isEditError.value) return false;
    const err = editError.value;
    if (axios.isAxiosError(err)) return err.response?.status === 404;
    return false;
});
const isGenericLoadError = computed<boolean>(() => isEditError.value && !isNotFound.value);

// ─── Two-mode form schema (per §10.10) ─────────────────────────────────────
// Two distinct schemas, picked by mode. VeeValidate re-validates the
// form when the schema ref changes — switching modes (in practice,
// only on mount; the same component instance doesn't transition
// modes mid-lifecycle) lands on the right rules in one tick.
const activeSchema = computed(() =>
    isEditMode.value ? tenantEditSchema : tenantCreateSchema,
);

// Initial values cover both shapes. The create-mode `company` +
// `initial_admin` blocks are present-but-empty in edit mode (Zod's
// strip-unknown drops them from the validated payload).
const defaultInitial = {
    slug: '',
    name: '',
    legal_name: '',
    country_code: 'KH',
    default_currency: 'USD',
    functional_currency: 'USD',
    timezone: 'Asia/Phnom_Penh',
    status: 'active' as 'active' | 'suspended',
    company: {
        slug: '',
        name: '',
        legal_name: '',
    },
    initial_admin: {
        name: '',
        email: '',
    },
};

const { handleSubmit, setErrors, setValues, values, isSubmitting } = useForm({
    validationSchema: computed(() => toTypedSchema(activeSchema.value)),
    initialValues: defaultInitial,
});

// ─── Slugify-on-name affordance (Session 6 plan tightening #4) ────────────
// Declared BEFORE the pre-fill watch below — the watch runs with
// `immediate: true` and, on a warm-cache navigate-from-detail mount,
// fires SYNCHRONOUSLY during setup with the cached tenant payload.
// It assigns to these two refs to lock the slug against auto-clobber;
// if the refs are declared after the watch, the synchronous fire hits
// a TDZ ReferenceError and the entire setup() throws → blank page.
// Cold-cache (hard reload) never tripped this because `tenant` is
// undefined and the watch early-returns before touching the refs.
const slugManuallyEdited = ref<boolean>(false);
const companySlugManuallyEdited = ref<boolean>(false);

// Pre-fill from edit data when it lands.
watch(
    () => editData.value?.data,
    (tenant) => {
        if (!tenant) return;
        setValues({
            slug: tenant.slug,
            name: tenant.name,
            legal_name: tenant.legal_name ?? '',
            country_code: tenant.country_code,
            default_currency: tenant.default_currency,
            functional_currency: tenant.functional_currency,
            timezone: tenant.timezone,
            // Status is restricted to active|suspended for editing;
            // archived tenants would land in the form with status
            // narrowed to 'active' for safety (the backend would 422
            // an archived → active transition if we ever exposed it).
            status: tenant.status === 'suspended' ? 'suspended' : 'active',
        });
        // Editing an existing tenant — the slug is already set by the
        // user historically; treat it as manually-edited so name
        // changes don't clobber.
        slugManuallyEdited.value = true;
        companySlugManuallyEdited.value = true;
    },
    { immediate: true },
);

watch(
    () => values.name,
    (name) => {
        if (slugManuallyEdited.value) return;
        if (!name) return;
        setValues({ slug: slugify(name) });
    },
);

watch(
    () => (values as { company?: { name?: string } }).company?.name,
    (name) => {
        if (companySlugManuallyEdited.value) return;
        if (!name) return;
        const company = (values as { company?: { name?: string; slug?: string; legal_name?: string | null } }).company ?? {};
        setValues({ company: { ...company, slug: slugify(name), name } } as Partial<typeof values>);
    },
);

// ─── One-time password banner state (Session 6 plan tightening #2) ────────
const initialAdminPassword = ref<string | null>(null);
const initialAdminEmail = ref<string | null>(null);
const createdTenant = ref<Tenant | null>(null);

const showPasswordBanner = computed<boolean>(
    () => initialAdminPassword.value !== null && createdTenant.value !== null,
);

function onPasswordAcknowledged(): void {
    initialAdminPassword.value = null;
    initialAdminEmail.value = null;
    // Navigate to the new tenant's detail page now that the SA has
    // copied the credentials.
    if (createdTenant.value) {
        void router.push({
            name: SUPER_ADMIN_ROUTES.TENANT_DETAIL,
            params: { id: createdTenant.value.id },
        });
    }
}

// ─── Submit ─────────────────────────────────────────────────────────────────
const createMutation = useCreateTenant();
const updateMutation = useUpdateTenant();
const formError = ref<string | null>(null);

interface StatusOption {
    value: 'active' | 'suspended';
    label: string;
}
const statusOptions = computed<StatusOption[]>(() => [
    { value: 'active', label: t('superAdmin.tenants.status.active') },
    { value: 'suspended', label: t('superAdmin.tenants.status.suspended') },
]);

function isAxiosErr(e: unknown): e is import('axios').AxiosError<ApiErrorBody> {
    return axios.isAxiosError(e);
}

function emptyToNull(v: string | null | undefined): string | null {
    if (v === undefined || v === null) return null;
    return v === '' ? null : v;
}

const onSubmit = handleSubmit(async (vals) => {
    formError.value = null;

    try {
        if (isEditMode.value && props.id) {
            // Edit payload — profile + status only.
            const editVals = vals as typeof vals & { status: 'active' | 'suspended' };
            const res = await updateMutation.mutateAsync({
                id: props.id,
                payload: {
                    slug: editVals.slug,
                    name: editVals.name,
                    legal_name: emptyToNull(editVals.legal_name),
                    country_code: editVals.country_code,
                    default_currency: editVals.default_currency,
                    functional_currency: editVals.functional_currency,
                    timezone: editVals.timezone,
                    status: editVals.status,
                },
            });
            toast.add({
                severity: 'success',
                summary: t('superAdmin.tenants.form.toast.updated'),
                life: 3000,
            });
            void router.push({
                name: SUPER_ADMIN_ROUTES.TENANT_DETAIL,
                params: { id: res.data.id },
            });
            return;
        }

        // Create.
        const createVals = vals as typeof vals & {
            company: { slug: string; name: string; legal_name?: string | null };
            initial_admin: { name: string; email: string };
        };
        const res = await createMutation.mutateAsync({
            slug: createVals.slug,
            name: createVals.name,
            legal_name: emptyToNull(createVals.legal_name),
            country_code: createVals.country_code,
            default_currency: createVals.default_currency,
            functional_currency: createVals.functional_currency,
            timezone: createVals.timezone,
            company: {
                slug: createVals.company.slug,
                name: createVals.company.name,
                legal_name: emptyToNull(createVals.company.legal_name ?? null),
            },
            initial_admin: {
                name: createVals.initial_admin.name,
                email: createVals.initial_admin.email,
            },
        });

        // One-time password — surface in the banner. The user
        // acknowledges before navigation continues.
        createdTenant.value = res.data.tenant;
        initialAdminPassword.value = res.data.initial_admin_password;
        initialAdminEmail.value = res.data.initial_admin.email;
        toast.add({
            severity: 'success',
            summary: t('superAdmin.tenants.form.toast.created'),
            life: 3000,
        });
    } catch (e: unknown) {
        if (!isAxiosErr(e) || !e.response) {
            formError.value = t('superAdmin.tenants.form.errors.unknown');
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
            formError.value = t('superAdmin.tenants.form.errors.forbidden');
            return;
        }

        formError.value = t('superAdmin.tenants.form.errors.unknown');
    }
});

function onCancel(): void {
    if (isEditMode.value && props.id) {
        void router.push({
            name: SUPER_ADMIN_ROUTES.TENANT_DETAIL,
            params: { id: props.id },
        });
    } else {
        void router.push({ name: SUPER_ADMIN_ROUTES.TENANT_LIST });
    }
}

// Track manual slug edits — only count an edit as "manual" if the
// new value differs from the auto-generated value at that moment.
function onSlugInput(): void {
    slugManuallyEdited.value = true;
}
function onCompanySlugInput(): void {
    companySlugManuallyEdited.value = true;
}

const pageTitle = computed<string>(() =>
    isEditMode.value
        ? editData.value?.data?.name ?? t('superAdmin.tenants.form.edit.title')
        : t('superAdmin.tenants.form.create.title'),
);

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const trail: BreadcrumbItem[] = [
        {
            label: t('superAdmin.tenants.breadcrumb.list'),
            to: { name: SUPER_ADMIN_ROUTES.TENANT_LIST },
        },
    ];
    if (isEditMode.value) {
        trail.push({
            label: editData.value?.data?.name ?? t('superAdmin.tenants.breadcrumb.edit'),
            to: props.id
                ? { name: SUPER_ADMIN_ROUTES.TENANT_DETAIL, params: { id: String(props.id) } }
                : { name: SUPER_ADMIN_ROUTES.TENANT_LIST },
        });
        trail.push({ label: t('superAdmin.tenants.breadcrumb.edit') });
    } else {
        trail.push({ label: t('superAdmin.tenants.breadcrumb.new') });
    }
    return trail;
});
</script>

<template>
    <PageLayout width="narrow">
        <template v-if="isEditMode && isLoadingEdit">
            <PageHeader
                :title="t('superAdmin.tenants.form.edit.title')"
                :breadcrumbs="[{ label: t('superAdmin.tenants.breadcrumb.list'), to: { name: SUPER_ADMIN_ROUTES.TENANT_LIST } }]"
            />
            <LoadingState variant="detail" data-testid="tenant-form-loading" />
        </template>

        <template v-else-if="isEditMode && isNotFound">
            <NotFoundPage data-testid="tenant-form-not-found" />
        </template>

        <template v-else-if="isEditMode && isGenericLoadError">
            <ErrorState data-testid="tenant-form-load-error" />
        </template>

        <template v-else>
            <PageHeader :title="pageTitle" :breadcrumbs="breadcrumbs" />

            <!-- One-time password banner — visible ONLY on create success.
                 Acknowledgement unmounts the banner and navigates to
                 the new tenant's detail page. The password is GONE from
                 the SPA after acknowledgement; no re-fetch path. -->
            <InitialAdminPasswordBanner
                v-if="showPasswordBanner && initialAdminPassword !== null && initialAdminEmail !== null"
                :password="initialAdminPassword"
                :admin-email="initialAdminEmail"
                @acknowledged="onPasswordAcknowledged"
            />

            <!-- Form is hidden once the create succeeds and the banner
                 takes over the visible surface. -->
            <CardSection v-if="!showPasswordBanner">
                <div
                    v-if="formError"
                    role="alert"
                    data-testid="tenant-form-error-banner"
                    class="mb-4 rounded-md border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-text"
                >
                    {{ formError }}
                </div>

                <form class="flex flex-col gap-6" novalidate @submit.prevent="onSubmit">
                    <!-- Section 1: Tenant profile -->
                    <section class="flex flex-col gap-5">
                        <h2 class="text-sm font-semibold uppercase text-text-tertiary">
                            {{ t('superAdmin.tenants.form.sections.profile') }}
                        </h2>
                        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <FormField
                                v-slot="{ field }"
                                name="name"
                                :label="t('superAdmin.tenants.form.fields.name')"
                                required
                            >
                                <InputText
                                    v-bind="field"
                                    class="w-full"
                                    autocomplete="off"
                                    data-testid="tenant-form-name"
                                />
                            </FormField>

                            <FormField
                                v-slot="{ field }"
                                name="slug"
                                :label="t('superAdmin.tenants.form.fields.slug')"
                                :help="t('superAdmin.tenants.form.fields.slugHelp')"
                                required
                            >
                                <InputText
                                    v-bind="field"
                                    class="w-full"
                                    autocomplete="off"
                                    data-testid="tenant-form-slug"
                                    @input="onSlugInput"
                                />
                            </FormField>

                            <FormField
                                v-slot="{ field }"
                                name="legal_name"
                                :label="t('superAdmin.tenants.form.fields.legalName')"
                            >
                                <InputText
                                    v-bind="field"
                                    class="w-full"
                                    data-testid="tenant-form-legal-name"
                                />
                            </FormField>

                            <FormField
                                v-if="isEditMode"
                                v-slot="{ field }"
                                name="status"
                                :label="t('superAdmin.tenants.form.fields.status')"
                                required
                            >
                                <Select
                                    v-bind="field"
                                    :options="statusOptions"
                                    option-label="label"
                                    option-value="value"
                                    class="w-full"
                                    data-testid="tenant-form-status"
                                />
                            </FormField>

                            <FormField
                                v-slot="{ field }"
                                name="country_code"
                                :label="t('superAdmin.tenants.form.fields.country')"
                                required
                            >
                                <InputText
                                    v-bind="field"
                                    class="w-full uppercase"
                                    maxlength="2"
                                    data-testid="tenant-form-country"
                                />
                            </FormField>

                            <FormField
                                v-slot="{ field }"
                                name="functional_currency"
                                :label="t('superAdmin.tenants.form.fields.functionalCurrency')"
                                required
                            >
                                <InputText
                                    v-bind="field"
                                    class="w-full uppercase"
                                    maxlength="3"
                                    data-testid="tenant-form-functional-currency"
                                />
                            </FormField>

                            <FormField
                                v-slot="{ field }"
                                name="default_currency"
                                :label="t('superAdmin.tenants.form.fields.defaultCurrency')"
                                required
                            >
                                <InputText
                                    v-bind="field"
                                    class="w-full uppercase"
                                    maxlength="3"
                                    data-testid="tenant-form-default-currency"
                                />
                            </FormField>

                            <FormField
                                v-slot="{ field }"
                                name="timezone"
                                :label="t('superAdmin.tenants.form.fields.timezone')"
                                required
                            >
                                <InputText
                                    v-bind="field"
                                    class="w-full"
                                    data-testid="tenant-form-timezone"
                                />
                            </FormField>
                        </div>
                    </section>

                    <!-- Section 2: Default company (create only) -->
                    <section v-if="!isEditMode" class="flex flex-col gap-5" data-testid="tenant-form-company-section">
                        <h2 class="text-sm font-semibold uppercase text-text-tertiary">
                            {{ t('superAdmin.tenants.form.sections.company') }}
                        </h2>
                        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <FormField
                                v-slot="{ field }"
                                name="company.name"
                                :label="t('superAdmin.tenants.form.fields.companyName')"
                                required
                            >
                                <InputText
                                    v-bind="field"
                                    class="w-full"
                                    data-testid="tenant-form-company-name"
                                />
                            </FormField>

                            <FormField
                                v-slot="{ field }"
                                name="company.slug"
                                :label="t('superAdmin.tenants.form.fields.companySlug')"
                                required
                            >
                                <InputText
                                    v-bind="field"
                                    class="w-full"
                                    autocomplete="off"
                                    data-testid="tenant-form-company-slug"
                                    @input="onCompanySlugInput"
                                />
                            </FormField>

                            <FormField
                                v-slot="{ field }"
                                name="company.legal_name"
                                :label="t('superAdmin.tenants.form.fields.companyLegalName')"
                            >
                                <InputText
                                    v-bind="field"
                                    class="w-full"
                                    data-testid="tenant-form-company-legal-name"
                                />
                            </FormField>
                        </div>
                    </section>

                    <!-- Section 3: Initial admin (create only) -->
                    <section v-if="!isEditMode" class="flex flex-col gap-5" data-testid="tenant-form-initial-admin-section">
                        <h2 class="text-sm font-semibold uppercase text-text-tertiary">
                            {{ t('superAdmin.tenants.form.sections.initialAdmin') }}
                        </h2>
                        <p class="text-sm text-text-secondary">
                            {{ t('superAdmin.tenants.form.sections.initialAdminHelp') }}
                        </p>
                        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <FormField
                                v-slot="{ field }"
                                name="initial_admin.name"
                                :label="t('superAdmin.tenants.form.fields.adminName')"
                                required
                            >
                                <InputText
                                    v-bind="field"
                                    class="w-full"
                                    autocomplete="name"
                                    data-testid="tenant-form-admin-name"
                                />
                            </FormField>

                            <FormField
                                v-slot="{ field }"
                                name="initial_admin.email"
                                :label="t('superAdmin.tenants.form.fields.adminEmail')"
                                required
                            >
                                <InputText
                                    v-bind="field"
                                    type="email"
                                    class="w-full"
                                    autocomplete="email"
                                    data-testid="tenant-form-admin-email"
                                />
                            </FormField>
                        </div>
                    </section>

                    <FormActions
                        :submit-label="isEditMode
                            ? t('superAdmin.tenants.form.edit.submit')
                            : t('superAdmin.tenants.form.create.submit')"
                        :loading="isSubmitting"
                        @submit="onSubmit"
                        @cancel="onCancel"
                    />
                </form>
            </CardSection>
        </template>
    </PageLayout>
</template>
