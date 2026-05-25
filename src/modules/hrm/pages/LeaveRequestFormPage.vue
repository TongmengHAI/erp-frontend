<script setup lang="ts">
import axios from 'axios';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useField, useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
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
    useCreateLeaveRequest,
    useLeaveRequestQuery,
    useUpdateLeaveRequest,
} from '@/modules/hrm/composables/useLeaveRequests';
import { useEmployeesQuery } from '@/modules/hrm/composables/useEmployees';
import {
    leaveRequestFormSchema,
    type LeaveRequestFormValues,
} from '@/modules/hrm/schemas/leaveRequestFormSchema';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type { ApiErrorBody } from '@/modules/auth/types';
import {
    LEAVE_TYPES,
    type LeaveRequestStatus,
    type LeaveType,
} from '@/modules/hrm/types/leaveRequest';
import {
    dateToYYYYMMDD,
    stringToDate,
} from '@/modules/hrm/utils/dateConversion';
import type { BreadcrumbItem } from '@/shared/types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// LeaveRequestFormPage — create AND edit, mode determined by route name.
//
//   /hrm/leave-requests/new       → HRM_ROUTES.LEAVE_REQUEST_NEW   → create
//   /hrm/leave-requests/:id/edit  → HRM_ROUTES.LEAVE_REQUEST_EDIT  → edit
//
// State-machine guard on the edit route: the backend
// UpdateLeaveRequestAction throws InvalidLeaveRequestTransitionException
// when the row isn't pending (self-rendered as 422 invalid_transition).
// We catch the same case proactively here — if a user lands on
// /leave-requests/{id}/edit for a decided row (direct URL, stale
// browser tab, etc.), the page renders a "this request is decided"
// block instead of the form. Defense in depth: the form's submit
// handler ALSO handles 422 invalid_transition by toasting + navigating
// back to detail (covers race conditions where the row got decided
// between page-load and submit).
//
// 422 → setErrors per the LoginPage / EmployeeFormPage pattern. The
// transition error has a distinct error_code so the handler can
// distinguish it from generic field validation.
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
    () => route.name === HRM_ROUTES.LEAVE_REQUEST_EDIT,
);

// ─── Edit-mode data load ────────────────────────────────────────────────────
const {
    data: editData,
    isLoading: isLoadingEdit,
    isError: isEditError,
    error: editError,
} = useLeaveRequestQuery(() => props.id ?? 0);

const isNotFound = computed<boolean>(() => {
    if (!isEditError.value) return false;
    const err = editError.value;
    if (axios.isAxiosError(err)) return err.response?.status === 404;
    return false;
});
const isGenericLoadError = computed<boolean>(
    () => isEditError.value && !isNotFound.value,
);

// The decided-row guard. We check the loaded row's status to decide
// whether to render the form or the "this request is decided" block.
// Computed off editData so it's reactive to the query state — switches
// from null (loading) to the actual status when data arrives.
const loadedStatus = computed<LeaveRequestStatus | null>(
    () => editData.value?.data.status ?? null,
);
const isDecidedRow = computed<boolean>(
    () => isEditMode.value && loadedStatus.value !== null && loadedStatus.value !== 'pending',
);

// ─── Form state ─────────────────────────────────────────────────────────────
const defaultInitial: LeaveRequestFormValues = {
    employee_id: 0, // 0 is invalid via the Zod positive() check — forces a real pick
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: '',
};

const { handleSubmit, setErrors, setValues, isSubmitting } =
    useForm<LeaveRequestFormValues>({
        validationSchema: toTypedSchema(leaveRequestFormSchema),
        initialValues: defaultInitial,
    });

watch(
    () => editData.value?.data,
    (lr) => {
        if (!lr) return;
        setValues({
            // Employee may be null when the parent row was soft-deleted —
            // we surface "" / 0 here so the picker shows the placeholder.
            // The form won't submit because the schema requires positive().
            employee_id: lr.employee?.id ?? 0,
            leave_type: lr.leave_type,
            start_date: lr.start_date,
            end_date: lr.end_date,
            reason: lr.reason ?? '',
        });
    },
    { immediate: true },
);

// ─── Employee picker data ───────────────────────────────────────────────────
// per_page: 100 — same cap as Department picker on Employee form. Beyond
// 100 active employees, the form needs a typeahead.
const employeesQuery = useEmployeesQuery(() => ({
    status: 'active' as const,
    per_page: 100,
}));

// useField bypass — the picker emits number, not string. Same
// standalone-chrome FormField pattern as EmployeeFormPage's department
// picker.
const {
    value: employeeIdValue,
    handleChange: handleEmployeeIdChange,
    handleBlur: handleEmployeeIdBlur,
} = useField<number>('employee_id');

interface EmployeeOption {
    value: number;
    label: string;
}
const employeeOptions = computed<EmployeeOption[]>(() =>
    (employeesQuery.data.value?.data ?? []).map((e) => ({
        value: e.id,
        label: `${e.full_name}${e.employee_code ? ` (${e.employee_code})` : ''}`,
    })),
);

// ─── Leave type options ─────────────────────────────────────────────────────
interface LeaveTypeOption {
    value: LeaveType;
    label: string;
}
const leaveTypeOptions = computed<LeaveTypeOption[]>(() =>
    LEAVE_TYPES.map((tt) => ({
        value: tt,
        label: t(`hrm.leaveRequest.type.${tt}`),
    })),
);

// ─── Mutations + submit ─────────────────────────────────────────────────────
const createMutation = useCreateLeaveRequest();
const updateMutation = useUpdateLeaveRequest();
const formError = ref<string | null>(null);

function normalizePayload(values: LeaveRequestFormValues) {
    return {
        employee_id: values.employee_id,
        leave_type: values.leave_type as LeaveType,
        start_date: values.start_date,
        end_date: values.end_date,
        reason: values.reason === '' ? null : values.reason ?? null,
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
                summary: t('hrm.leaveRequest.toast.updated'),
                life: 3000,
            });
            void router.push({
                name: HRM_ROUTES.LEAVE_REQUEST_DETAIL,
                params: { id: res.data.id },
            });
        } else {
            const res = await createMutation.mutateAsync(payload);
            toast.add({
                severity: 'success',
                summary: t('hrm.leaveRequest.toast.created'),
                life: 3000,
            });
            void router.push({
                name: HRM_ROUTES.LEAVE_REQUEST_DETAIL,
                params: { id: res.data.id },
            });
        }
    } catch (e: unknown) {
        if (!isAxiosErr(e) || !e.response) {
            formError.value = t('hrm.leaveRequest.form.errors.unknown');
            return;
        }
        const status = e.response.status;
        const body = e.response.data;

        if (status === 422) {
            // Two flavors of 422:
            //   1. Generic field validation — body.errors keyed by field
            //   2. Transition guard — body.error_code === 'invalid_transition'
            //      (row decided between page-load and submit, race condition)
            if (body && body.error_code === 'invalid_transition') {
                formError.value = null;
                toast.add({
                    severity: 'warn',
                    summary: t('hrm.leaveRequest.decide.toast.alreadyDecidedTitle'),
                    detail: t('hrm.leaveRequest.form.errors.invalidTransition'),
                    life: 4000,
                });
                // Bounce to detail — the page will render in decided mode
                // and the user sees the current state.
                if (props.id) {
                    void router.push({
                        name: HRM_ROUTES.LEAVE_REQUEST_DETAIL,
                        params: { id: props.id },
                    });
                }
                return;
            }
            if (body && body.errors) {
                const fieldErrors: Record<string, string> = {};
                for (const [field, msgs] of Object.entries(body.errors)) {
                    if (msgs && msgs.length > 0) fieldErrors[field] = msgs[0];
                }
                setErrors(fieldErrors);
                return;
            }
            formError.value = t('hrm.leaveRequest.form.errors.unknown');
            return;
        }

        if (status === 403) {
            formError.value = t('hrm.leaveRequest.form.errors.forbidden');
            return;
        }

        formError.value = t('hrm.leaveRequest.form.errors.unknown');
    }
});

function onCancel(): void {
    if (isEditMode.value && props.id) {
        void router.push({
            name: HRM_ROUTES.LEAVE_REQUEST_DETAIL,
            params: { id: props.id },
        });
    } else {
        void router.push({ name: HRM_ROUTES.LEAVE_REQUEST_LIST });
    }
}

function navigateToList(): void {
    void router.push({ name: HRM_ROUTES.LEAVE_REQUEST_LIST });
}

function navigateToDetail(): void {
    if (!props.id) return;
    void router.push({
        name: HRM_ROUTES.LEAVE_REQUEST_DETAIL,
        params: { id: props.id },
    });
}

// ─── Page chrome bindings ───────────────────────────────────────────────────
const pageTitle = computed<string>(() =>
    isEditMode.value
        ? t('hrm.leaveRequest.form.edit.title')
        : t('hrm.leaveRequest.form.create.title'),
);

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const trail: BreadcrumbItem[] = [
        { label: t('hrm.leaveRequest.breadcrumb.list'), to: { name: HRM_ROUTES.LEAVE_REQUEST_LIST } },
    ];
    if (isEditMode.value) {
        trail.push({
            label: editData.value?.data.employee?.full_name ?? t('hrm.leaveRequest.breadcrumb.edit'),
            to: props.id
                ? { name: HRM_ROUTES.LEAVE_REQUEST_DETAIL, params: { id: String(props.id) } }
                : { name: HRM_ROUTES.LEAVE_REQUEST_LIST },
        });
        trail.push({ label: t('hrm.leaveRequest.breadcrumb.edit') });
    } else {
        trail.push({ label: t('hrm.leaveRequest.breadcrumb.new') });
    }
    return trail;
});

const submitLabel = computed<string>(() => {
    if (isSubmitting.value) {
        return isEditMode.value
            ? t('hrm.leaveRequest.form.edit.submitting')
            : t('hrm.leaveRequest.form.create.submitting');
    }
    return isEditMode.value
        ? t('hrm.leaveRequest.form.edit.submit')
        : t('hrm.leaveRequest.form.create.submit');
});

function decidedStatusLabel(): string {
    const s = loadedStatus.value;
    if (!s) return '';
    return t(`hrm.leaveRequest.status.${s}`);
}
</script>

<template>
    <PageLayout width="narrow">
        <!-- Edit-mode loading. -->
        <template v-if="isEditMode && isLoadingEdit">
            <PageHeader
                :title="t('hrm.leaveRequest.form.edit.title')"
                :breadcrumbs="[{ label: t('hrm.leaveRequest.breadcrumb.list'), to: { name: HRM_ROUTES.LEAVE_REQUEST_LIST } }]"
            />
            <LoadingState variant="detail" data-testid="leave-request-form-loading" />
        </template>

        <template v-else-if="isEditMode && isNotFound">
            <PageHeader
                :title="t('hrm.leaveRequest.notFound.title')"
                :breadcrumbs="[{ label: t('hrm.leaveRequest.breadcrumb.list'), to: { name: HRM_ROUTES.LEAVE_REQUEST_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="leave-request-form-not-found"
                >
                    <i class="pi pi-compass text-5xl text-text-tertiary" aria-hidden="true"></i>
                    <h2 class="text-xl font-medium text-text-primary">
                        {{ t('hrm.leaveRequest.notFound.title') }}
                    </h2>
                    <p class="max-w-md text-base text-text-secondary">
                        {{ t('hrm.leaveRequest.notFound.description') }}
                    </p>
                    <Button
                        :label="t('hrm.leaveRequest.notFound.action')"
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
                :title="t('hrm.leaveRequest.form.edit.title')"
                :breadcrumbs="[{ label: t('hrm.leaveRequest.breadcrumb.list'), to: { name: HRM_ROUTES.LEAVE_REQUEST_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="leave-request-form-load-error"
                >
                    <i class="pi pi-exclamation-triangle text-5xl text-danger" aria-hidden="true"></i>
                    <h2 class="text-xl font-medium text-text-primary">{{ t('common.error.title') }}</h2>
                    <p class="max-w-md text-base text-text-secondary">{{ t('common.error.description') }}</p>
                </div>
            </CardSection>
        </template>

        <!-- DECIDED-ROW GUARD: if a user opens /edit on a row that isn't
             pending (direct URL, stale tab), render an explanatory block
             instead of the form. The form would submit fine via the
             schema but the backend would 422 invalid_transition; better
             to communicate the state explicitly. Defense in depth: even
             if a user bypassed this via API, the backend Action throws. -->
        <template v-else-if="isDecidedRow">
            <PageHeader
                :title="t('hrm.leaveRequest.form.edit.decidedBlockTitle')"
                :breadcrumbs="breadcrumbs"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="leave-request-form-decided-block"
                >
                    <i class="pi pi-lock text-5xl text-text-tertiary" aria-hidden="true"></i>
                    <h2 class="text-xl font-medium text-text-primary">
                        {{ t('hrm.leaveRequest.form.edit.decidedBlockTitle') }}
                    </h2>
                    <p class="max-w-md text-base text-text-secondary">
                        {{
                            t('hrm.leaveRequest.form.edit.decidedBlockMessage', {
                                status: decidedStatusLabel(),
                            })
                        }}
                    </p>
                    <Button
                        :label="t('hrm.leaveRequest.form.edit.decidedBlockBack')"
                        icon="pi pi-arrow-left"
                        severity="secondary"
                        class="mt-2"
                        data-testid="leave-request-form-decided-back"
                        @click="navigateToDetail"
                    />
                </div>
            </CardSection>
        </template>

        <!-- Populated form (create mode OR edit on pending row). -->
        <template v-else>
            <PageHeader :title="pageTitle" :breadcrumbs="breadcrumbs" />

            <CardSection>
                <div
                    v-if="formError"
                    role="alert"
                    data-testid="leave-request-form-error-banner"
                    class="mb-4 rounded-md border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-text"
                >
                    {{ formError }}
                </div>

                <form class="flex flex-col gap-5" novalidate @submit.prevent="onSubmit">
                    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField
                            name="employee_id"
                            :label="t('hrm.leaveRequest.form.fields.employee')"
                            required
                        >
                            <Select
                                :model-value="employeeIdValue || null"
                                name="employee_id"
                                :options="employeeOptions"
                                option-label="label"
                                option-value="value"
                                :placeholder="t('hrm.leaveRequest.form.fields.noEmployee')"
                                :loading="employeesQuery.isLoading.value"
                                :disabled="employeesQuery.isLoading.value"
                                filter
                                class="w-full"
                                data-testid="leave-request-form-employee"
                                @update:model-value="
                                    (v) => handleEmployeeIdChange((v as number | null) ?? 0)
                                "
                                @blur="() => handleEmployeeIdBlur()"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="leave_type"
                            :label="t('hrm.leaveRequest.form.fields.type')"
                            required
                        >
                            <Select
                                v-bind="field"
                                :options="leaveTypeOptions"
                                option-label="label"
                                option-value="value"
                                class="w-full"
                                data-testid="leave-request-form-type"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="start_date"
                            :label="t('hrm.leaveRequest.form.fields.startDate')"
                            required
                        >
                            <DatePicker
                                :model-value="stringToDate(field.modelValue)"
                                :name="field.name"
                                date-format="yy-mm-dd"
                                show-icon
                                show-button-bar
                                class="w-full"
                                input-class="w-full"
                                data-testid="leave-request-form-start-date"
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
                            name="end_date"
                            :label="t('hrm.leaveRequest.form.fields.endDate')"
                            required
                        >
                            <DatePicker
                                :model-value="stringToDate(field.modelValue)"
                                :name="field.name"
                                date-format="yy-mm-dd"
                                show-icon
                                show-button-bar
                                class="w-full"
                                input-class="w-full"
                                data-testid="leave-request-form-end-date"
                                @update:model-value="
                                    (d) =>
                                        field['onUpdate:modelValue'](
                                            dateToYYYYMMDD(d as Date | null),
                                        )
                                "
                                @blur="field.onBlur"
                            />
                        </FormField>

                        <div class="sm:col-span-2">
                            <FormField
                                v-slot="{ field }"
                                name="reason"
                                :label="t('hrm.leaveRequest.form.fields.reason')"
                                :help="t('hrm.leaveRequest.form.fields.reasonHelp')"
                            >
                                <Textarea
                                    v-bind="field"
                                    rows="3"
                                    class="w-full"
                                    auto-resize
                                    data-testid="leave-request-form-reason"
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
