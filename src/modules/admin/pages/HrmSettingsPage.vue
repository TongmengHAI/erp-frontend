<script setup lang="ts">
import axios from 'axios';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import { useToast } from 'primevue/usetoast';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import CardSection from '@/shared/components/layout/CardSection.vue';
import LoadingState from '@/shared/components/state/LoadingState.vue';
import ErrorState from '@/shared/components/state/ErrorState.vue';
import FormField from '@/shared/components/form/FormField.vue';
import FormActions from '@/shared/components/form/FormActions.vue';
import {
    useHrmSettingsQuery,
    useUpdateHrmSettings,
} from '@/modules/admin/composables/useHrmSettings';
import {
    hrmSettingsFormSchema,
    type HrmSettingsFormValues,
} from '@/modules/admin/schemas/hrmSettingsFormSchema';
import {
    DEFAULT_EMPLOYEE_STATUSES,
    type DefaultEmployeeStatus,
    type HrmSettings,
} from '@/modules/admin/types/hrmSettings';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useUrlNumericFilter } from '@/shared/composables/useUrlNumericFilter';
import type { ApiErrorBody } from '@/modules/auth/types';
import type { BreadcrumbItem } from '@/shared/types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// HrmSettingsPage — single-resource admin form for per-company HRM settings.
//
// Three deliberate design points (per the Session 2 plan):
//
//  1. Cross-field consistency: the Zod schema is a discriminated union on
//     `auto_generate_employee_code`. When the toggle flips ON, the prefix
//     field becomes required (Zod), the FormRequest fires the same rule on
//     the EFFECTIVE post-patch state, and the DB CHECK is the final
//     backstop. Triple-stack validation discipline.
//
//  2. Company picker: hidden when the admin has access to ONE company
//     (auth.companies.length < 2). Same hidden-when-redundant rule as the
//     AppSwitcherDropdown — a Select with one option is UI noise, not
//     affordance. URL is the source of truth for the selection — the
//     picker reads + writes ?company_id= via useUrlNumericFilter; reloads
//     and back/forward preserve the choice.
//
//  3. URL-driven query: useHrmSettingsQuery's params are computed from the
//     URL via the picker. Switching company in the Select writes the URL,
//     TanStack re-keys, the form re-initialises from the new data on the
//     existing `watch(editData)`. No imperative refetch.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const toast = useToast();
const auth = useAuthStore();

// Company picker — URL-driven. The picker writes ?company_id=X; the query
// reads the URL value as part of its key. Hidden when only one company is
// accessible (most v1 admins).
const companyFilter = useUrlNumericFilter('company_id');

const accessibleCompanies = computed(() => auth.companies);

const showCompanyPicker = computed<boolean>(
    () => accessibleCompanies.value.length >= 2,
);

interface CompanyOption {
    value: number;
    label: string;
}

const companyOptions = computed<CompanyOption[]>(() =>
    accessibleCompanies.value.map((c) => ({
        value: c.id,
        label: c.name,
    })),
);

// The effective company_id passed to the query: URL value when present,
// otherwise null → backend defaults to current company. Both branches
// converge on the same response shape; the URL value just lets the admin
// look at a different company without changing CompanyContext for the
// rest of their session.
const queryParams = computed(() => {
    const id = companyFilter.value.value;
    return id !== null ? { company_id: id } : {};
});

const {
    data: settingsData,
    isLoading,
    isError,
    error,
    refetch,
} = useHrmSettingsQuery(queryParams);

const isNotFound = computed<boolean>(() => {
    if (!isError.value) return false;
    const err = error.value;
    if (axios.isAxiosError(err)) return err.response?.status === 404;
    return false;
});

const isGenericLoadError = computed<boolean>(
    () => isError.value && !isNotFound.value,
);

// Form scaffolding — defaults match the bootstrap row's shape (auto-gen
// OFF, no prefix, default status 'active') so the form renders sensibly
// before the GET resolves.
const defaultInitial: HrmSettingsFormValues = {
    auto_generate_employee_code: false,
    employee_code_prefix: null,
    default_employee_status: 'active',
};

const { handleSubmit, setErrors, setValues, values, isSubmitting } =
    useForm<HrmSettingsFormValues>({
        validationSchema: toTypedSchema(hrmSettingsFormSchema),
        initialValues: defaultInitial,
    });

// Re-populate on every settings fetch (initial load AND company switch).
watch(
    () => settingsData.value?.data,
    (s) => {
        if (!s) return;
        applyServerStateToForm(s);
    },
    { immediate: true },
);

function applyServerStateToForm(s: HrmSettings): void {
    // The discriminated union narrows by the literal `true`/`false` of
    // auto_generate_employee_code — pass through the boolean exactly,
    // not coerced.
    if (s.auto_generate_employee_code) {
        setValues({
            auto_generate_employee_code: true,
            employee_code_prefix: s.employee_code_prefix ?? '',
            default_employee_status: s.default_employee_status,
        });
    } else {
        setValues({
            auto_generate_employee_code: false,
            employee_code_prefix: s.employee_code_prefix,
            default_employee_status: s.default_employee_status,
        });
    }
}

const updateMutation = useUpdateHrmSettings();
const formError = ref<string | null>(null);

interface StatusOption {
    value: DefaultEmployeeStatus;
    label: string;
}

const statusOptions = computed<StatusOption[]>(() =>
    DEFAULT_EMPLOYEE_STATUSES.map((s) => ({
        value: s,
        label: t(`admin.settings.hrm.status.${s}`),
    })),
);

function emptyToNull(v: string | null | undefined): string | null {
    if (v === undefined || v === null) return null;
    return v === '' ? null : v;
}

function isAxiosErr(e: unknown): e is import('axios').AxiosError<ApiErrorBody> {
    return axios.isAxiosError(e);
}

const onSubmit = handleSubmit(async (vals) => {
    const id = settingsData.value?.data.id;
    if (!id) return;

    formError.value = null;

    const payload = {
        auto_generate_employee_code: vals.auto_generate_employee_code,
        employee_code_prefix: emptyToNull(vals.employee_code_prefix ?? null),
        default_employee_status: vals.default_employee_status as DefaultEmployeeStatus,
    };

    try {
        await updateMutation.mutateAsync({ id, payload });
        toast.add({
            severity: 'success',
            summary: t('admin.settings.hrm.toast.updated'),
            life: 3000,
        });
    } catch (e: unknown) {
        if (!isAxiosErr(e) || !e.response) {
            formError.value = t('admin.settings.hrm.form.errors.unknown');
            return;
        }
        const status = e.response.status;
        const body = e.response.data;

        if (status === 422 && body?.errors) {
            // Map field-keyed 422 errors to VeeValidate's setErrors.
            // The cross-field rule lands as errors.employee_code_prefix
            // from the FormRequest's withValidator hook — same target
            // as the Zod-side error, so the field shows ONE inline
            // message regardless of which layer caught it.
            const fieldErrors: Record<string, string> = {};
            for (const [field, msgs] of Object.entries(body.errors)) {
                if (msgs && msgs.length > 0) fieldErrors[field] = msgs[0];
            }
            setErrors(fieldErrors);
            return;
        }

        if (status === 403) {
            formError.value = t('admin.settings.hrm.form.errors.forbidden');
            return;
        }

        formError.value = t('admin.settings.hrm.form.errors.unknown');
    }
});

const breadcrumbs = computed<BreadcrumbItem[]>(() => [
    { label: t('admin.settings.hrm.breadcrumb') },
]);

const pageTitle = computed<string>(() => t('admin.settings.hrm.title'));

const submitLabel = computed<string>(() =>
    isSubmitting.value
        ? t('admin.settings.hrm.form.submitting')
        : t('admin.settings.hrm.form.submit'),
);

// Help-text for the prefix field — context flips with the toggle so the
// user immediately sees why it became required.
const prefixHelpText = computed<string>(() =>
    values.auto_generate_employee_code
        ? t('admin.settings.hrm.form.fields.prefixHelpOn')
        : t('admin.settings.hrm.form.fields.prefixHelpOff'),
);

function onCompanyChange(next: number | null): void {
    void companyFilter.set(next);
}

// Cancel resets the form to the last server-side state. A settings page
// has no list view to "go back to" — Cancel = discard pending edits,
// re-show the truth-on-disk values.
function onCancel(): void {
    const s = settingsData.value?.data;
    if (s) applyServerStateToForm(s);
    formError.value = null;
}

function onRetry(): void {
    void refetch();
}
</script>

<template>
    <PageLayout width="narrow">
        <PageHeader :title="pageTitle" :breadcrumbs="breadcrumbs" />

        <!-- Company picker — visible only when the admin has access to
             2+ companies. Same hidden-when-redundant rule as the
             AppSwitcherDropdown in v1. Mirrors the auth.companies list. -->
        <CardSection v-if="showCompanyPicker" class="mb-4">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <FormField
                    name="company_picker"
                    :label="t('admin.settings.hrm.companyPicker.label')"
                    :help="t('admin.settings.hrm.companyPicker.help')"
                >
                    <Select
                        :model-value="companyFilter.value.value"
                        :options="companyOptions"
                        option-label="label"
                        option-value="value"
                        :placeholder="t('admin.settings.hrm.companyPicker.placeholder')"
                        class="w-full sm:w-80"
                        data-testid="settings-hrm-company-picker"
                        @update:model-value="onCompanyChange"
                    />
                </FormField>
            </div>
        </CardSection>

        <template v-if="isLoading">
            <LoadingState variant="detail" data-testid="settings-hrm-loading" />
        </template>

        <template v-else-if="isNotFound">
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="settings-hrm-not-found"
                >
                    <i class="pi pi-compass text-5xl text-text-tertiary" aria-hidden="true"></i>
                    <h2 class="text-xl font-medium text-text-primary">
                        {{ t('admin.settings.hrm.notFound.title') }}
                    </h2>
                    <p class="max-w-md text-base text-text-secondary">
                        {{ t('admin.settings.hrm.notFound.description') }}
                    </p>
                </div>
            </CardSection>
        </template>

        <template v-else-if="isGenericLoadError">
            <ErrorState data-testid="settings-hrm-load-error" @retry="onRetry" />
        </template>

        <template v-else>
            <CardSection>
                <div
                    v-if="formError"
                    role="alert"
                    data-testid="settings-hrm-error-banner"
                    class="mb-4 rounded-md border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-text"
                >
                    {{ formError }}
                </div>

                <form class="flex flex-col gap-5" novalidate @submit.prevent="onSubmit">
                    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField
                            v-slot="{ field }"
                            name="auto_generate_employee_code"
                            :label="t('admin.settings.hrm.form.fields.autoGenerate')"
                            :help="t('admin.settings.hrm.form.fields.autoGenerateHelp')"
                        >
                            <ToggleSwitch
                                :model-value="field.modelValue as unknown as boolean"
                                data-testid="settings-hrm-auto-generate"
                                @update:model-value="
                                    (v: boolean) =>
                                        field['onUpdate:modelValue'](v as unknown as string | undefined)
                                "
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="employee_code_prefix"
                            :label="t('admin.settings.hrm.form.fields.prefix')"
                            :help="prefixHelpText"
                            :required="values.auto_generate_employee_code"
                        >
                            <InputText
                                v-bind="field"
                                class="w-full uppercase tabular-nums"
                                maxlength="8"
                                autocomplete="off"
                                data-testid="settings-hrm-prefix"
                            />
                        </FormField>

                        <div class="sm:col-span-2">
                            <FormField
                                v-slot="{ field }"
                                name="default_employee_status"
                                :label="t('admin.settings.hrm.form.fields.defaultStatus')"
                                :help="t('admin.settings.hrm.form.fields.defaultStatusHelp')"
                                required
                            >
                                <Select
                                    v-bind="field"
                                    :options="statusOptions"
                                    option-label="label"
                                    option-value="value"
                                    class="w-full sm:w-80"
                                    data-testid="settings-hrm-default-status"
                                />
                            </FormField>
                        </div>
                    </div>

                    <FormActions
                        :submit-label="submitLabel"
                        :cancel-label="t('admin.settings.hrm.form.cancel')"
                        :loading="isSubmitting"
                        @submit="onSubmit"
                        @cancel="onCancel"
                    />
                </form>
            </CardSection>
        </template>
    </PageLayout>
</template>
