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
    useBranchQuery,
    useCreateBranch,
    useUpdateBranch,
} from '@/modules/hrm/composables/useBranches';
import {
    branchFormSchema,
    type BranchFormValues,
} from '@/modules/hrm/schemas/branchFormSchema';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type { ApiErrorBody } from '@/modules/auth/types';
import {
    BRANCH_STATUSES,
    type BranchStatus,
} from '@/modules/hrm/types/branch';
import type { BreadcrumbItem } from '@/shared/types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// BranchFormPage — direct transposition of PositionFormPage, extended
// with the four location fields Branch adds: address, city, country_code,
// phone. Same VeeValidate + Zod wiring, same 422 → setErrors path,
// same submit-stays-clickable rule. Textarea for description AND
// address (both 500-char fields).
//
// country_code regex mirrors the backend's FormRequest exactly
// (/^[A-Z]{2}$/). Lowercase 'kh' surfaces both as a client-side Zod
// error AND, if it slips past, as a server 422 — same setErrors path
// catches both. Defense in depth.
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
    () => route.name === HRM_ROUTES.BRANCH_EDIT,
);

const {
    data: editData,
    isLoading: isLoadingEdit,
    isError: isEditError,
    error: editError,
} = useBranchQuery(() => props.id ?? 0);

const isNotFound = computed<boolean>(() => {
    if (!isEditError.value) return false;
    const err = editError.value;
    if (axios.isAxiosError(err)) return err.response?.status === 404;
    return false;
});
const isGenericLoadError = computed<boolean>(
    () => isEditError.value && !isNotFound.value,
);

const defaultInitial: BranchFormValues = {
    code: '',
    name: '',
    description: '',
    address: '',
    city: '',
    country_code: '',
    phone: '',
    status: 'active',
};

const { handleSubmit, setErrors, setValues, isSubmitting } =
    useForm<BranchFormValues>({
        validationSchema: toTypedSchema(branchFormSchema),
        initialValues: defaultInitial,
    });

watch(
    () => editData.value?.data,
    (branch) => {
        if (!branch) return;
        setValues({
            code: branch.code,
            name: branch.name,
            description: branch.description ?? '',
            address: branch.address ?? '',
            city: branch.city ?? '',
            country_code: branch.country_code ?? '',
            phone: branch.phone ?? '',
            status: branch.status,
        });
    },
    { immediate: true },
);

const createMutation = useCreateBranch();
const updateMutation = useUpdateBranch();
const formError = ref<string | null>(null);

interface StatusOption {
    value: BranchStatus;
    label: string;
}
const statusOptions = computed<StatusOption[]>(() =>
    BRANCH_STATUSES.map((s) => ({
        value: s,
        label: t(`hrm.branch.status.${s}`),
    })),
);

function emptyToNull(v: string | null | undefined): string | null {
    if (v === undefined || v === null) return null;
    return v === '' ? null : v;
}

function normalizePayload(values: BranchFormValues) {
    return {
        code: values.code,
        name: values.name,
        description: emptyToNull(values.description),
        address: emptyToNull(values.address),
        city: emptyToNull(values.city),
        country_code: emptyToNull(values.country_code),
        phone: emptyToNull(values.phone),
        status: values.status as BranchStatus,
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
                summary: t('hrm.branch.toast.updated'),
                life: 3000,
            });
            void router.push({
                name: HRM_ROUTES.BRANCH_DETAIL,
                params: { id: res.data.id },
            });
        } else {
            const res = await createMutation.mutateAsync(payload);
            toast.add({
                severity: 'success',
                summary: t('hrm.branch.toast.created'),
                life: 3000,
            });
            void router.push({
                name: HRM_ROUTES.BRANCH_DETAIL,
                params: { id: res.data.id },
            });
        }
    } catch (e: unknown) {
        if (!isAxiosErr(e) || !e.response) {
            formError.value = t('hrm.branch.form.errors.unknown');
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
            formError.value = t('hrm.branch.form.errors.forbidden');
            return;
        }

        formError.value = t('hrm.branch.form.errors.unknown');
    }
});

function onCancel(): void {
    if (isEditMode.value && props.id) {
        void router.push({
            name: HRM_ROUTES.BRANCH_DETAIL,
            params: { id: props.id },
        });
    } else {
        void router.push({ name: HRM_ROUTES.BRANCH_LIST });
    }
}

function navigateToList(): void {
    void router.push({ name: HRM_ROUTES.BRANCH_LIST });
}

const pageTitle = computed<string>(() =>
    isEditMode.value
        ? (editData.value?.data?.name ?? t('hrm.branch.form.edit.title'))
        : t('hrm.branch.form.create.title'),
);

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const trail: BreadcrumbItem[] = [
        { label: t('hrm.branch.breadcrumb.list'), to: { name: HRM_ROUTES.BRANCH_LIST } },
    ];
    if (isEditMode.value) {
        trail.push({
            label: editData.value?.data?.name ?? t('hrm.branch.breadcrumb.edit'),
            to: props.id
                ? { name: HRM_ROUTES.BRANCH_DETAIL, params: { id: String(props.id) } }
                : { name: HRM_ROUTES.BRANCH_LIST },
        });
        trail.push({ label: t('hrm.branch.breadcrumb.edit') });
    } else {
        trail.push({ label: t('hrm.branch.breadcrumb.new') });
    }
    return trail;
});

const submitLabel = computed<string>(() => {
    if (isSubmitting.value) {
        return isEditMode.value
            ? t('hrm.branch.form.edit.submitting')
            : t('hrm.branch.form.create.submitting');
    }
    return isEditMode.value
        ? t('hrm.branch.form.edit.submit')
        : t('hrm.branch.form.create.submit');
});
</script>

<template>
    <PageLayout width="narrow">
        <template v-if="isEditMode && isLoadingEdit">
            <PageHeader
                :title="t('hrm.branch.form.edit.title')"
                :breadcrumbs="[{ label: t('hrm.branch.breadcrumb.list'), to: { name: HRM_ROUTES.BRANCH_LIST } }]"
            />
            <LoadingState variant="detail" data-testid="branch-form-loading" />
        </template>

        <template v-else-if="isEditMode && isNotFound">
            <PageHeader
                :title="t('hrm.branch.notFound.title')"
                :breadcrumbs="[{ label: t('hrm.branch.breadcrumb.list'), to: { name: HRM_ROUTES.BRANCH_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="branch-form-not-found"
                >
                    <i class="pi pi-compass text-5xl text-text-tertiary" aria-hidden="true"></i>
                    <h2 class="text-xl font-medium text-text-primary">
                        {{ t('hrm.branch.notFound.title') }}
                    </h2>
                    <p class="max-w-md text-base text-text-secondary">
                        {{ t('hrm.branch.notFound.description') }}
                    </p>
                    <Button
                        :label="t('hrm.branch.notFound.action')"
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
                :title="t('hrm.branch.form.edit.title')"
                :breadcrumbs="[{ label: t('hrm.branch.breadcrumb.list'), to: { name: HRM_ROUTES.BRANCH_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="branch-form-load-error"
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
                    data-testid="branch-form-error-banner"
                    class="mb-4 rounded-md border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-text"
                >
                    {{ formError }}
                </div>

                <form class="flex flex-col gap-5" novalidate @submit.prevent="onSubmit">
                    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField
                            v-slot="{ field }"
                            name="code"
                            :label="t('hrm.branch.form.fields.code')"
                            :help="t('hrm.branch.form.fields.codeHelp')"
                            required
                        >
                            <InputText
                                v-bind="field"
                                class="w-full"
                                autocomplete="off"
                                data-testid="branch-form-code"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="name"
                            :label="t('hrm.branch.form.fields.name')"
                            required
                        >
                            <InputText
                                v-bind="field"
                                class="w-full"
                                data-testid="branch-form-name"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="city"
                            :label="t('hrm.branch.form.fields.city')"
                        >
                            <InputText
                                v-bind="field"
                                class="w-full"
                                autocomplete="address-level2"
                                data-testid="branch-form-city"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="country_code"
                            :label="t('hrm.branch.form.fields.countryCode')"
                            :help="t('hrm.branch.form.fields.countryCodeHelp')"
                        >
                            <InputText
                                v-bind="field"
                                class="w-full uppercase tabular-nums"
                                maxlength="2"
                                autocomplete="country"
                                data-testid="branch-form-country-code"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="phone"
                            :label="t('hrm.branch.form.fields.phone')"
                        >
                            <InputText
                                v-bind="field"
                                class="w-full"
                                type="tel"
                                autocomplete="tel"
                                data-testid="branch-form-phone"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="status"
                            :label="t('hrm.branch.form.fields.status')"
                            required
                        >
                            <Select
                                v-bind="field"
                                :options="statusOptions"
                                option-label="label"
                                option-value="value"
                                class="w-full"
                                data-testid="branch-form-status"
                            />
                        </FormField>

                        <div class="sm:col-span-2">
                            <FormField
                                v-slot="{ field }"
                                name="address"
                                :label="t('hrm.branch.form.fields.address')"
                                :help="t('hrm.branch.form.fields.addressHelp')"
                            >
                                <Textarea
                                    v-bind="field"
                                    rows="2"
                                    class="w-full"
                                    autocomplete="street-address"
                                    data-testid="branch-form-address"
                                />
                            </FormField>
                        </div>

                        <div class="sm:col-span-2">
                            <FormField
                                v-slot="{ field }"
                                name="description"
                                :label="t('hrm.branch.form.fields.description')"
                                :help="t('hrm.branch.form.fields.descriptionHelp')"
                            >
                                <Textarea
                                    v-bind="field"
                                    rows="3"
                                    class="w-full"
                                    data-testid="branch-form-description"
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
