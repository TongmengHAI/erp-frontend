<script setup lang="ts">
import axios from 'axios';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { useToast } from 'primevue/usetoast';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import CardSection from '@/shared/components/layout/CardSection.vue';
import LoadingState from '@/shared/components/state/LoadingState.vue';
import FormField from '@/shared/components/form/FormField.vue';
import FormActions from '@/shared/components/form/FormActions.vue';
import {
    useCreateEmployee,
    useEmployeeQuery,
    useUpdateEmployee,
} from '@/modules/hrm/composables/useEmployees';
import {
    employeeFormSchema,
    type EmployeeFormValues,
} from '@/modules/hrm/schemas/employeeFormSchema';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type { ApiErrorBody } from '@/modules/auth/types';
import {
    EMPLOYEE_STATUSES,
    type EmployeeStatus,
} from '@/modules/hrm/types/employee';
import {
    dateToYYYYMMDD,
    stringToDate,
} from '@/modules/hrm/utils/dateConversion';
import type { BreadcrumbItem } from '@/shared/types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// EmployeeFormPage — create AND edit, mode determined by route name.
//
// Single-component-two-modes pattern (per routes.ts):
//   /hrm/employees/new       → HRM_ROUTES.EMPLOYEE_NEW       → create
//   /hrm/employees/:id/edit  → HRM_ROUTES.EMPLOYEE_EDIT      → edit
//
// VeeValidate + Zod (employeeFormSchema). Each field wrapped in FormField
// using the F5 scoped-slot pattern (v-slot="{ field }" → v-bind="field").
//
// 422 → setErrors per LoginPage's spike pattern (Day 1). The page-level
// interceptor passes 422 through untouched; we map errors.{field}[0] → the
// VeeValidate setErrors map. Live-verified against a duplicate employee_code
// submit during Day 5 smoke.
//
// hire_date crosses two type boundaries: the backend wants YYYY-MM-DD
// strings; PrimeVue DatePicker emits Date objects. FormField's slot is
// typed `string | undefined`, so the conversion happens at the call site
// — string in via stringToDate(), string out via dateToYYYYMMDD(). The
// utility module covers the local-vs-UTC parsing trap; see its docblock.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    /** Resolved from the route via `props: (route) => ({ id: ... })`.
     *  Undefined on create routes. */
    id?: number;
}
const props = defineProps<Props>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed<boolean>(
    () => route.name === HRM_ROUTES.EMPLOYEE_EDIT,
);

// ─── Edit-mode data load ────────────────────────────────────────────────────
// The query auto-disables itself when id is falsy (composable's `enabled`
// guard), so create-mode renders without firing a useless fetch.
const {
    data: editData,
    isLoading: isLoadingEdit,
    isError: isEditError,
    error: editError,
} = useEmployeeQuery(() => props.id ?? 0);

const isNotFound = computed<boolean>(() => {
    if (!isEditError.value) return false;
    const err = editError.value;
    if (axios.isAxiosError(err)) return err.response?.status === 404;
    return false;
});
const isGenericLoadError = computed<boolean>(
    () => isEditError.value && !isNotFound.value,
);

// ─── Form state ─────────────────────────────────────────────────────────────
const defaultInitial: EmployeeFormValues = {
    employee_code: '',
    full_name: '',
    email: '',
    job_title: '',
    hire_date: '',
    status: 'active',
};

const { handleSubmit, setErrors, setValues, isSubmitting } =
    useForm<EmployeeFormValues>({
        validationSchema: toTypedSchema(employeeFormSchema),
        initialValues: defaultInitial,
    });

/**
 * Pre-fill the form once edit data arrives. Watch fires exactly once per
 * load (data is stable post-fetch). resetForm would clear dirty state, but
 * since this runs before the user has interacted, setValues is enough.
 */
watch(
    () => editData.value?.data,
    (employee) => {
        if (!employee) return;
        setValues({
            employee_code: employee.employee_code,
            full_name: employee.full_name,
            email: employee.email ?? '',
            job_title: employee.job_title ?? '',
            hire_date: employee.hire_date,
            status: employee.status,
        });
    },
    { immediate: true },
);

// ─── Mutations + submit ─────────────────────────────────────────────────────
const createMutation = useCreateEmployee();
const updateMutation = useUpdateEmployee();
const formError = ref<string | null>(null);

interface StatusOption {
    value: EmployeeStatus;
    label: string;
}
const statusOptions = computed<StatusOption[]>(() =>
    EMPLOYEE_STATUSES.map((s) => ({
        value: s,
        label: t(`hrm.employee.status.${s}`),
    })),
);

/** Empty-string → null for nullable optional fields. The backend's
 *  StoreEmployeeRequest treats null/missing as "no value"; bare '' would
 *  fail the email validator. */
function normalizePayload(values: EmployeeFormValues) {
    return {
        employee_code: values.employee_code,
        full_name: values.full_name,
        email: values.email === '' ? null : values.email,
        job_title: values.job_title === '' ? null : values.job_title,
        hire_date: values.hire_date,
        status: values.status as EmployeeStatus,
    };
}

function isAxiosErr(e: unknown): e is import('axios').AxiosError<ApiErrorBody> {
    return axios.isAxiosError(e);
}

const onSubmit = handleSubmit(async (values) => {
    formError.value = null;
    const payload = normalizePayload(values);

    try {
        if (isEditMode.value && props.id) {
            const res = await updateMutation.mutateAsync({
                id: props.id,
                payload,
            });
            toast.add({
                severity: 'success',
                summary: t('hrm.employee.toast.updated'),
                life: 3000,
            });
            void router.push({
                name: HRM_ROUTES.EMPLOYEE_DETAIL,
                params: { id: res.data.id },
            });
        } else {
            const res = await createMutation.mutateAsync(payload);
            toast.add({
                severity: 'success',
                summary: t('hrm.employee.toast.created'),
                life: 3000,
            });
            void router.push({
                name: HRM_ROUTES.EMPLOYEE_DETAIL,
                params: { id: res.data.id },
            });
        }
    } catch (e: unknown) {
        if (!isAxiosErr(e) || !e.response) {
            formError.value = t('hrm.employee.form.errors.unknown');
            return;
        }
        const status = e.response.status;
        const body = e.response.data;

        if (status === 422 && body?.errors) {
            // Backend ships arrays per field; VeeValidate wants a single
            // string per field. First-message convention from LoginPage.
            const fieldErrors: Record<string, string> = {};
            for (const [field, msgs] of Object.entries(body.errors)) {
                if (msgs && msgs.length > 0) fieldErrors[field] = msgs[0];
            }
            setErrors(fieldErrors);
            return;
        }

        if (status === 403) {
            formError.value = t('hrm.employee.form.errors.forbidden');
            return;
        }

        formError.value = t('hrm.employee.form.errors.unknown');
    }
});

function onCancel(): void {
    if (isEditMode.value && props.id) {
        void router.push({
            name: HRM_ROUTES.EMPLOYEE_DETAIL,
            params: { id: props.id },
        });
    } else {
        void router.push({ name: HRM_ROUTES.EMPLOYEE_LIST });
    }
}

function navigateToList(): void {
    void router.push({ name: HRM_ROUTES.EMPLOYEE_LIST });
}

// ─── Page chrome bindings ───────────────────────────────────────────────────
const pageTitle = computed<string>(() =>
    isEditMode.value
        ? editData.value?.data?.full_name ?? t('hrm.employee.form.edit.title')
        : t('hrm.employee.form.create.title'),
);

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const trail: BreadcrumbItem[] = [
        { label: t('hrm.employee.breadcrumb.list'), to: { name: HRM_ROUTES.EMPLOYEE_LIST } },
    ];
    if (isEditMode.value) {
        trail.push({
            label: editData.value?.data?.full_name ?? t('hrm.employee.breadcrumb.edit'),
            to: props.id
                ? { name: HRM_ROUTES.EMPLOYEE_DETAIL, params: { id: String(props.id) } }
                : { name: HRM_ROUTES.EMPLOYEE_LIST },
        });
        // Trailing crumb has no `to` — it's the current page.
        trail.push({ label: t('hrm.employee.breadcrumb.edit') });
    } else {
        trail.push({ label: t('hrm.employee.breadcrumb.new') });
    }
    return trail;
});

const submitLabel = computed<string>(() => {
    if (isSubmitting.value) {
        return isEditMode.value
            ? t('hrm.employee.form.edit.submitting')
            : t('hrm.employee.form.create.submitting');
    }
    return isEditMode.value
        ? t('hrm.employee.form.edit.submit')
        : t('hrm.employee.form.create.submit');
});

// Submit button stays clickable even when fields are blank — VeeValidate's
// handleSubmit guards correctness, and disabling-on-invalid is the anti-
// pattern that surfaced as Day 6 Bug 1: a user trying to submit got no
// feedback (button grayed out silently). With the gate off, clicking
// triggers handleSubmit, which runs the schema and surfaces inline errors
// next to each failing field. The button is still inert during in-flight
// requests (FormActions's `loading` prop handles that).
</script>

<template>
    <PageLayout width="narrow">
        <!-- Edit-mode loading: skeleton + chrome shell. -->
        <template v-if="isEditMode && isLoadingEdit">
            <PageHeader
                :title="t('hrm.employee.form.edit.title')"
                :breadcrumbs="[{ label: t('hrm.employee.breadcrumb.list'), to: { name: HRM_ROUTES.EMPLOYEE_LIST } }]"
            />
            <LoadingState variant="detail" data-testid="employee-form-loading" />
        </template>

        <!-- Edit-mode not-found: same 404 card the detail page uses. -->
        <template v-else-if="isEditMode && isNotFound">
            <PageHeader
                :title="t('hrm.employee.notFound.title')"
                :breadcrumbs="[{ label: t('hrm.employee.breadcrumb.list'), to: { name: HRM_ROUTES.EMPLOYEE_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="employee-form-not-found"
                >
                    <i class="pi pi-compass text-5xl text-text-tertiary" aria-hidden="true"></i>
                    <h2 class="text-xl font-medium text-text-primary">
                        {{ t('hrm.employee.notFound.title') }}
                    </h2>
                    <p class="max-w-md text-base text-text-secondary">
                        {{ t('hrm.employee.notFound.description') }}
                    </p>
                    <Button
                        :label="t('hrm.employee.notFound.action')"
                        icon="pi pi-arrow-left"
                        severity="secondary"
                        class="mt-2"
                        @click="navigateToList"
                    />
                </div>
            </CardSection>
        </template>

        <!-- Edit-mode generic load error. -->
        <template v-else-if="isEditMode && isGenericLoadError">
            <PageHeader
                :title="t('hrm.employee.form.edit.title')"
                :breadcrumbs="[{ label: t('hrm.employee.breadcrumb.list'), to: { name: HRM_ROUTES.EMPLOYEE_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="employee-form-load-error"
                >
                    <i
                        class="pi pi-exclamation-triangle text-5xl text-danger"
                        aria-hidden="true"
                    ></i>
                    <h2 class="text-xl font-medium text-text-primary">
                        {{ t('common.error.title') }}
                    </h2>
                    <p class="max-w-md text-base text-text-secondary">
                        {{ t('common.error.description') }}
                    </p>
                </div>
            </CardSection>
        </template>

        <!-- Populated form (create mode or edit-loaded). -->
        <template v-else>
            <PageHeader :title="pageTitle" :breadcrumbs="breadcrumbs" />

            <CardSection>
                <div
                    v-if="formError"
                    role="alert"
                    data-testid="employee-form-error-banner"
                    class="mb-4 rounded-md border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-text"
                >
                    {{ formError }}
                </div>

                <form class="flex flex-col gap-5" novalidate @submit.prevent="onSubmit">
                    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField
                            v-slot="{ field }"
                            name="employee_code"
                            :label="t('hrm.employee.form.fields.code')"
                            :help="t('hrm.employee.form.fields.codeHelp')"
                            required
                        >
                            <InputText
                                v-bind="field"
                                class="w-full"
                                autocomplete="off"
                                data-testid="employee-form-code"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="full_name"
                            :label="t('hrm.employee.form.fields.fullName')"
                            required
                        >
                            <InputText
                                v-bind="field"
                                class="w-full"
                                autocomplete="name"
                                data-testid="employee-form-name"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="email"
                            :label="t('hrm.employee.form.fields.email')"
                            :help="t('hrm.employee.form.fields.emailHelp')"
                        >
                            <InputText
                                v-bind="field"
                                type="email"
                                class="w-full"
                                autocomplete="email"
                                data-testid="employee-form-email"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="job_title"
                            :label="t('hrm.employee.form.fields.jobTitle')"
                            :help="t('hrm.employee.form.fields.jobTitleHelp')"
                        >
                            <InputText
                                v-bind="field"
                                class="w-full"
                                autocomplete="organization-title"
                                data-testid="employee-form-job-title"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="hire_date"
                            :label="t('hrm.employee.form.fields.hireDate')"
                            required
                        >
                            <!-- DatePicker speaks Date objects; the form
                                 state speaks YYYY-MM-DD strings. The
                                 manual wiring below bridges both directions
                                 (v-bind="field" can't reach DatePicker
                                 because field.modelValue is typed as
                                 string and DatePicker emits Date). Reading
                                 in: stringToDate(field.modelValue) hydrates
                                 the picker from the form state. Writing
                                 out: dateToYYYYMMDD(d) commits the user's
                                 pick back to the form state. onBlur is
                                 forwarded so VeeValidate's blur-side
                                 validation still fires. -->
                            <DatePicker
                                :model-value="stringToDate(field.modelValue)"
                                :name="field.name"
                                date-format="yy-mm-dd"
                                show-icon
                                show-button-bar
                                class="w-full"
                                input-class="w-full"
                                data-testid="employee-form-hire-date"
                                @update:model-value="
                                    (d) =>
                                        field['onUpdate:modelValue'](
                                            dateToYYYYMMDD(d as Date | null),
                                        )
                                "
                                @blur="field.onBlur"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="status"
                            :label="t('hrm.employee.form.fields.status')"
                            required
                        >
                            <Select
                                v-bind="field"
                                :options="statusOptions"
                                option-label="label"
                                option-value="value"
                                class="w-full"
                                data-testid="employee-form-status"
                            />
                        </FormField>
                    </div>

                    <FormActions
                        :submit-label="submitLabel"
                        :loading="isSubmitting"
                        @submit="onSubmit"
                        @cancel="onCancel"
                    />
                </form>
            </CardSection>
        </template>
    </PageLayout>
</template>
