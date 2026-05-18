<script setup lang="ts">
import axios from 'axios';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import CardSection from '@/shared/components/layout/CardSection.vue';
import LoadingState from '@/shared/components/state/LoadingState.vue';
import FormField from '@/shared/components/form/FormField.vue';
import FormActions from '@/shared/components/form/FormActions.vue';
import {
    useCreateDepartment,
    useDepartmentQuery,
    useUpdateDepartment,
} from '@/modules/hrm/composables/useDepartments';
import {
    departmentFormSchema,
    type DepartmentFormValues,
} from '@/modules/hrm/schemas/departmentFormSchema';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type { ApiErrorBody } from '@/modules/auth/types';
import {
    DEPARTMENT_STATUSES,
    type DepartmentStatus,
} from '@/modules/hrm/types/department';
import type { BreadcrumbItem } from '@/shared/types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// DepartmentFormPage — create AND edit, mode determined by route name.
//
// Direct transposition of EmployeeFormPage. Simpler:
//   - 4 fields (code, name, description, status) vs Employee's 6
//   - No DatePicker / dateConversion (no date fields)
//   - description uses PrimeVue Textarea (multi-line) — only structural
//     departure from Employee, justified by the 500-char nature of the
//     field (a multi-line input reads as "short paragraph" vs the
//     single-line input that reads as "label")
//
// Same 422 → setErrors path (LoginPage pattern), same submit-stays-
// clickable rule (handleSubmit guards correctness; greying-out is the
// anti-pattern Day 6 fixed on Employee).
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
    () => route.name === HRM_ROUTES.DEPARTMENT_EDIT,
);

// ─── Edit-mode data load ────────────────────────────────────────────────────
const {
    data: editData,
    isLoading: isLoadingEdit,
    isError: isEditError,
    error: editError,
} = useDepartmentQuery(() => props.id ?? 0);

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
const defaultInitial: DepartmentFormValues = {
    code: '',
    name: '',
    description: '',
    status: 'active',
};

const { handleSubmit, setErrors, setValues, isSubmitting } =
    useForm<DepartmentFormValues>({
        validationSchema: toTypedSchema(departmentFormSchema),
        initialValues: defaultInitial,
    });

watch(
    () => editData.value?.data,
    (department) => {
        if (!department) return;
        setValues({
            code: department.code,
            name: department.name,
            description: department.description ?? '',
            status: department.status,
        });
    },
    { immediate: true },
);

// ─── Mutations + submit ─────────────────────────────────────────────────────
const createMutation = useCreateDepartment();
const updateMutation = useUpdateDepartment();
const formError = ref<string | null>(null);

interface StatusOption {
    value: DepartmentStatus;
    label: string;
}
const statusOptions = computed<StatusOption[]>(() =>
    DEPARTMENT_STATUSES.map((s) => ({
        value: s,
        label: t(`hrm.department.status.${s}`),
    })),
);

/** Empty-string → null for the nullable description. */
function normalizePayload(values: DepartmentFormValues) {
    return {
        code: values.code,
        name: values.name,
        description: values.description === '' ? null : values.description,
        status: values.status as DepartmentStatus,
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
                summary: t('hrm.department.toast.updated'),
                life: 3000,
            });
            void router.push({
                name: HRM_ROUTES.DEPARTMENT_DETAIL,
                params: { id: res.data.id },
            });
        } else {
            const res = await createMutation.mutateAsync(payload);
            toast.add({
                severity: 'success',
                summary: t('hrm.department.toast.created'),
                life: 3000,
            });
            void router.push({
                name: HRM_ROUTES.DEPARTMENT_DETAIL,
                params: { id: res.data.id },
            });
        }
    } catch (e: unknown) {
        if (!isAxiosErr(e) || !e.response) {
            formError.value = t('hrm.department.form.errors.unknown');
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
            formError.value = t('hrm.department.form.errors.forbidden');
            return;
        }

        formError.value = t('hrm.department.form.errors.unknown');
    }
});

function onCancel(): void {
    if (isEditMode.value && props.id) {
        void router.push({
            name: HRM_ROUTES.DEPARTMENT_DETAIL,
            params: { id: props.id },
        });
    } else {
        void router.push({ name: HRM_ROUTES.DEPARTMENT_LIST });
    }
}

function navigateToList(): void {
    void router.push({ name: HRM_ROUTES.DEPARTMENT_LIST });
}

// ─── Page chrome ────────────────────────────────────────────────────────────
const pageTitle = computed<string>(() =>
    isEditMode.value
        ? editData.value?.data?.name ?? t('hrm.department.form.edit.title')
        : t('hrm.department.form.create.title'),
);

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const trail: BreadcrumbItem[] = [
        { label: t('hrm.department.breadcrumb.list'), to: { name: HRM_ROUTES.DEPARTMENT_LIST } },
    ];
    if (isEditMode.value) {
        trail.push({
            label: editData.value?.data?.name ?? t('hrm.department.breadcrumb.edit'),
            to: props.id
                ? { name: HRM_ROUTES.DEPARTMENT_DETAIL, params: { id: String(props.id) } }
                : { name: HRM_ROUTES.DEPARTMENT_LIST },
        });
        trail.push({ label: t('hrm.department.breadcrumb.edit') });
    } else {
        trail.push({ label: t('hrm.department.breadcrumb.new') });
    }
    return trail;
});

const submitLabel = computed<string>(() => {
    if (isSubmitting.value) {
        return isEditMode.value
            ? t('hrm.department.form.edit.submitting')
            : t('hrm.department.form.create.submitting');
    }
    return isEditMode.value
        ? t('hrm.department.form.edit.submit')
        : t('hrm.department.form.create.submit');
});
</script>

<template>
    <PageLayout width="narrow">
        <template v-if="isEditMode && isLoadingEdit">
            <PageHeader
                :title="t('hrm.department.form.edit.title')"
                :breadcrumbs="[{ label: t('hrm.department.breadcrumb.list'), to: { name: HRM_ROUTES.DEPARTMENT_LIST } }]"
            />
            <LoadingState variant="detail" data-testid="department-form-loading" />
        </template>

        <template v-else-if="isEditMode && isNotFound">
            <PageHeader
                :title="t('hrm.department.notFound.title')"
                :breadcrumbs="[{ label: t('hrm.department.breadcrumb.list'), to: { name: HRM_ROUTES.DEPARTMENT_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="department-form-not-found"
                >
                    <i class="pi pi-compass text-5xl text-text-tertiary" aria-hidden="true"></i>
                    <h2 class="text-xl font-medium text-text-primary">
                        {{ t('hrm.department.notFound.title') }}
                    </h2>
                    <p class="max-w-md text-base text-text-secondary">
                        {{ t('hrm.department.notFound.description') }}
                    </p>
                    <Button
                        :label="t('hrm.department.notFound.action')"
                        icon="pi pi-arrow-left"
                        severity="secondary"
                        class="mt-2"
                        @click="navigateToList"
                    />
                </div>
            </CardSection>
        </template>

        <template v-else-if="isEditMode && isGenericLoadError">
            <PageHeader
                :title="t('hrm.department.form.edit.title')"
                :breadcrumbs="[{ label: t('hrm.department.breadcrumb.list'), to: { name: HRM_ROUTES.DEPARTMENT_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="department-form-load-error"
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

        <template v-else>
            <PageHeader :title="pageTitle" :breadcrumbs="breadcrumbs" />

            <CardSection>
                <div
                    v-if="formError"
                    role="alert"
                    data-testid="department-form-error-banner"
                    class="mb-4 rounded-md border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-text"
                >
                    {{ formError }}
                </div>

                <form class="flex flex-col gap-5" novalidate @submit.prevent="onSubmit">
                    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField
                            v-slot="{ field }"
                            name="code"
                            :label="t('hrm.department.form.fields.code')"
                            :help="t('hrm.department.form.fields.codeHelp')"
                            required
                        >
                            <InputText
                                v-bind="field"
                                class="w-full"
                                autocomplete="off"
                                data-testid="department-form-code"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="name"
                            :label="t('hrm.department.form.fields.name')"
                            required
                        >
                            <InputText
                                v-bind="field"
                                class="w-full"
                                data-testid="department-form-name"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="status"
                            :label="t('hrm.department.form.fields.status')"
                            required
                        >
                            <Select
                                v-bind="field"
                                :options="statusOptions"
                                option-label="label"
                                option-value="value"
                                class="w-full"
                                data-testid="department-form-status"
                            />
                        </FormField>

                        <div class="sm:col-span-2">
                            <FormField
                                v-slot="{ field }"
                                name="description"
                                :label="t('hrm.department.form.fields.description')"
                                :help="t('hrm.department.form.fields.descriptionHelp')"
                            >
                                <!-- Textarea over InputText because the field is
                                     up to 500 chars — a multi-line input reads
                                     as "short paragraph" vs a single-line input
                                     reading as "label". Only structural
                                     departure from EmployeeFormPage's input
                                     types; binding is the same FormField scoped
                                     slot pattern. -->
                                <Textarea
                                    v-bind="field"
                                    rows="3"
                                    class="w-full"
                                    data-testid="department-form-description"
                                />
                            </FormField>
                        </div>
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
