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
    useCreatePosition,
    usePositionQuery,
    useUpdatePosition,
} from '@/modules/hrm/composables/usePositions';
import {
    positionFormSchema,
    type PositionFormValues,
} from '@/modules/hrm/schemas/positionFormSchema';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type { ApiErrorBody } from '@/modules/auth/types';
import {
    POSITION_STATUSES,
    type PositionStatus,
} from '@/modules/hrm/types/position';
import type { BreadcrumbItem } from '@/shared/types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// PositionFormPage — direct transposition of DepartmentFormPage. Same
// 4 fields (code, title, description, status), same VeeValidate + Zod
// wiring, same 422 → setErrors path (LoginPage pattern), same
// submit-stays-clickable rule. Textarea for description, justified by
// the 500-char field shape.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    id?: number;
}
const props = defineProps<Props>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed<boolean>(
    () => route.name === HRM_ROUTES.POSITION_EDIT,
);

const {
    data: editData,
    isLoading: isLoadingEdit,
    isError: isEditError,
    error: editError,
} = usePositionQuery(() => props.id ?? 0);

const isNotFound = computed<boolean>(() => {
    if (!isEditError.value) return false;
    const err = editError.value;
    if (axios.isAxiosError(err)) return err.response?.status === 404;
    return false;
});
const isGenericLoadError = computed<boolean>(
    () => isEditError.value && !isNotFound.value,
);

const defaultInitial: PositionFormValues = {
    code: '',
    title: '',
    description: '',
    status: 'active',
};

const { handleSubmit, setErrors, setValues, isSubmitting } =
    useForm<PositionFormValues>({
        validationSchema: toTypedSchema(positionFormSchema),
        initialValues: defaultInitial,
    });

watch(
    () => editData.value?.data,
    (position) => {
        if (!position) return;
        setValues({
            code: position.code,
            title: position.title,
            description: position.description ?? '',
            status: position.status,
        });
    },
    { immediate: true },
);

const createMutation = useCreatePosition();
const updateMutation = useUpdatePosition();
const formError = ref<string | null>(null);

interface StatusOption {
    value: PositionStatus;
    label: string;
}
const statusOptions = computed<StatusOption[]>(() =>
    POSITION_STATUSES.map((s) => ({
        value: s,
        label: t(`hrm.position.status.${s}`),
    })),
);

function normalizePayload(values: PositionFormValues) {
    return {
        code: values.code,
        title: values.title,
        description: values.description === '' ? null : (values.description ?? null),
        status: values.status as PositionStatus,
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
                summary: t('hrm.position.toast.updated'),
                life: 3000,
            });
            void router.push({
                name: HRM_ROUTES.POSITION_DETAIL,
                params: { id: res.data.id },
            });
        } else {
            const res = await createMutation.mutateAsync(payload);
            toast.add({
                severity: 'success',
                summary: t('hrm.position.toast.created'),
                life: 3000,
            });
            void router.push({
                name: HRM_ROUTES.POSITION_DETAIL,
                params: { id: res.data.id },
            });
        }
    } catch (e: unknown) {
        if (!isAxiosErr(e) || !e.response) {
            formError.value = t('hrm.position.form.errors.unknown');
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
            formError.value = t('hrm.position.form.errors.forbidden');
            return;
        }

        formError.value = t('hrm.position.form.errors.unknown');
    }
});

function onCancel(): void {
    if (isEditMode.value && props.id) {
        void router.push({
            name: HRM_ROUTES.POSITION_DETAIL,
            params: { id: props.id },
        });
    } else {
        void router.push({ name: HRM_ROUTES.POSITION_LIST });
    }
}

function navigateToList(): void {
    void router.push({ name: HRM_ROUTES.POSITION_LIST });
}

const pageTitle = computed<string>(() =>
    isEditMode.value
        ? (editData.value?.data?.title ?? t('hrm.position.form.edit.title'))
        : t('hrm.position.form.create.title'),
);

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const trail: BreadcrumbItem[] = [
        { label: t('hrm.position.breadcrumb.list'), to: { name: HRM_ROUTES.POSITION_LIST } },
    ];
    if (isEditMode.value) {
        trail.push({
            label: editData.value?.data?.title ?? t('hrm.position.breadcrumb.edit'),
            to: props.id
                ? { name: HRM_ROUTES.POSITION_DETAIL, params: { id: String(props.id) } }
                : { name: HRM_ROUTES.POSITION_LIST },
        });
        trail.push({ label: t('hrm.position.breadcrumb.edit') });
    } else {
        trail.push({ label: t('hrm.position.breadcrumb.new') });
    }
    return trail;
});

const submitLabel = computed<string>(() => {
    if (isSubmitting.value) {
        return isEditMode.value
            ? t('hrm.position.form.edit.submitting')
            : t('hrm.position.form.create.submitting');
    }
    return isEditMode.value
        ? t('hrm.position.form.edit.submit')
        : t('hrm.position.form.create.submit');
});
</script>

<template>
    <PageLayout width="narrow">
        <template v-if="isEditMode && isLoadingEdit">
            <PageHeader
                :title="t('hrm.position.form.edit.title')"
                :breadcrumbs="[{ label: t('hrm.position.breadcrumb.list'), to: { name: HRM_ROUTES.POSITION_LIST } }]"
            />
            <LoadingState variant="detail" data-testid="position-form-loading" />
        </template>

        <template v-else-if="isEditMode && isNotFound">
            <PageHeader
                :title="t('hrm.position.notFound.title')"
                :breadcrumbs="[{ label: t('hrm.position.breadcrumb.list'), to: { name: HRM_ROUTES.POSITION_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="position-form-not-found"
                >
                    <i class="pi pi-compass text-5xl text-text-tertiary" aria-hidden="true"></i>
                    <h2 class="text-xl font-medium text-text-primary">
                        {{ t('hrm.position.notFound.title') }}
                    </h2>
                    <p class="max-w-md text-base text-text-secondary">
                        {{ t('hrm.position.notFound.description') }}
                    </p>
                    <Button
                        :label="t('hrm.position.notFound.action')"
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
                :title="t('hrm.position.form.edit.title')"
                :breadcrumbs="[{ label: t('hrm.position.breadcrumb.list'), to: { name: HRM_ROUTES.POSITION_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="position-form-load-error"
                >
                    <i class="pi pi-exclamation-triangle text-5xl text-danger" aria-hidden="true"></i>
                    <h2 class="text-xl font-medium text-text-primary">{{ t('common.error.title') }}</h2>
                    <p class="max-w-md text-base text-text-secondary">{{ t('common.error.description') }}</p>
                </div>
            </CardSection>
        </template>

        <template v-else>
            <PageHeader :title="pageTitle" :breadcrumbs="breadcrumbs" />

            <CardSection>
                <div
                    v-if="formError"
                    role="alert"
                    data-testid="position-form-error-banner"
                    class="mb-4 rounded-md border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-text"
                >
                    {{ formError }}
                </div>

                <form class="flex flex-col gap-5" novalidate @submit.prevent="onSubmit">
                    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField
                            v-slot="{ field }"
                            name="code"
                            :label="t('hrm.position.form.fields.code')"
                            :help="t('hrm.position.form.fields.codeHelp')"
                            required
                        >
                            <InputText
                                v-bind="field"
                                class="w-full"
                                autocomplete="off"
                                data-testid="position-form-code"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="title"
                            :label="t('hrm.position.form.fields.title')"
                            required
                        >
                            <InputText
                                v-bind="field"
                                class="w-full"
                                data-testid="position-form-title"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="status"
                            :label="t('hrm.position.form.fields.status')"
                            required
                        >
                            <Select
                                v-bind="field"
                                :options="statusOptions"
                                option-label="label"
                                option-value="value"
                                class="w-full"
                                data-testid="position-form-status"
                            />
                        </FormField>

                        <div class="sm:col-span-2">
                            <FormField
                                v-slot="{ field }"
                                name="description"
                                :label="t('hrm.position.form.fields.description')"
                                :help="t('hrm.position.form.fields.descriptionHelp')"
                            >
                                <Textarea
                                    v-bind="field"
                                    rows="3"
                                    class="w-full"
                                    data-testid="position-form-description"
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
