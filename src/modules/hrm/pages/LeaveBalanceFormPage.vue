<script setup lang="ts">
import axios from 'axios';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useField, useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
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
    useCreateLeaveBalance,
    useLeaveBalanceQuery,
    useUpdateLeaveBalance,
} from '@/modules/hrm/composables/useLeaveBalances';
import { useEmployeesQuery } from '@/modules/hrm/composables/useEmployees';
import {
    leaveBalanceFormSchema,
    type LeaveBalanceFormValues,
} from '@/modules/hrm/schemas/leaveBalanceFormSchema';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type { ApiErrorBody } from '@/modules/auth/types';
import {
    BALANCE_LEAVE_TYPES,
    type BalanceLeaveType,
} from '@/modules/hrm/types/leaveBalance';
import type { BreadcrumbItem } from '@/shared/types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// LeaveBalanceFormPage — create OR edit, mode determined by route name.
//
//   /hrm/leave-balances/new       → LEAVE_BALANCE_NEW       → create
//   /hrm/leave-balances/:id/edit  → LEAVE_BALANCE_EDIT      → edit
//
// Five inputs:
//   • Employee   — standalone-chrome FormField + useField bypass
//     (Select emits number|null, same pattern as Employee form's
//     department/branch/position pickers).
//   • Leave type — Select restricted to annual/sick.
//   • Period year — InputNumber, defaults to current year.
//   • Allocated days — InputNumber, step 0.5, 1-decimal display.
//   • Notes — Textarea (optional, up to 500 chars).
//
// Edit-mode constraints: only allocated_days + notes are editable. The
// identity tuple (employee_id, leave_type, period_year) is read-only
// once the row exists; the form disables those three inputs in edit
// mode rather than hiding them (lets the user SEE the row's identity
// without breaking the field grid). UpdateLeaveBalanceRequest on the
// backend doesn't accept those fields — any attempt is silently
// dropped — but disabling here gives the user the right mental model.
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
    () => route.name === HRM_ROUTES.LEAVE_BALANCE_EDIT,
);

// ─── Edit-mode data load ───────────────────────────────────────────────────
const {
    data: editData,
    isLoading: isLoadingEdit,
    isError: isEditError,
    error: editError,
} = useLeaveBalanceQuery(() => props.id ?? 0);

const isNotFound = computed<boolean>(() => {
    if (!isEditError.value) return false;
    const err = editError.value;
    if (axios.isAxiosError(err)) return err.response?.status === 404;
    return false;
});
const isGenericLoadError = computed<boolean>(
    () => isEditError.value && !isNotFound.value,
);

// ─── Form state ────────────────────────────────────────────────────────────
const defaultInitial: LeaveBalanceFormValues = {
    employee_id: 0,
    leave_type: 'annual',
    period_year: new Date().getFullYear(),
    allocated_days: 14,
    notes: '',
};

const { handleSubmit, setErrors, setValues, isSubmitting } =
    useForm<LeaveBalanceFormValues>({
        validationSchema: toTypedSchema(leaveBalanceFormSchema),
        initialValues: defaultInitial,
    });

watch(
    () => editData.value?.data,
    (balance) => {
        if (!balance) return;
        setValues({
            employee_id: balance.employee?.id ?? 0,
            leave_type: balance.leave_type,
            period_year: balance.period_year,
            allocated_days: balance.allocated_days,
            notes: balance.notes ?? '',
        });
    },
    { immediate: true },
);

// ─── useField bypasses (same standalone-chrome pattern as the Employee
// form's pickers). period_year and allocated_days bypass too because
// FormField's scoped slot is string-typed and these are numbers.
const employeesQuery = useEmployeesQuery(() => ({
    status: 'active' as const,
    per_page: 100,
}));

const {
    value: employeeIdValue,
    handleChange: handleEmployeeIdChange,
    handleBlur: handleEmployeeIdBlur,
} = useField<number | null>('employee_id');

const {
    value: periodYearValue,
    handleChange: handlePeriodYearChange,
    handleBlur: handlePeriodYearBlur,
} = useField<number | null>('period_year');

const {
    value: allocatedDaysValue,
    handleChange: handleAllocatedDaysChange,
    handleBlur: handleAllocatedDaysBlur,
} = useField<number | null>('allocated_days');

interface EmployeeOption {
    value: number;
    label: string;
}
const employeeOptions = computed<EmployeeOption[]>(() =>
    (employeesQuery.data.value?.data ?? []).map((e) => ({
        value: e.id,
        label: e.employee_code ? `${e.full_name} — ${e.employee_code}` : e.full_name,
    })),
);

// ─── Leave-type picker ─────────────────────────────────────────────────────
// Restricted to the allocated subset; unpaid/other are unbounded and
// rejected at all three layers (TypeScript / FormRequest / DB CHECK).
interface LeaveTypeOption {
    value: BalanceLeaveType;
    label: string;
}
const leaveTypeOptions = computed<LeaveTypeOption[]>(() =>
    BALANCE_LEAVE_TYPES.map((type) => ({
        value: type,
        label: t(`hrm.leaveBalance.leaveType.${type}`),
    })),
);

// ─── Mutations + submit ────────────────────────────────────────────────────
const createMutation = useCreateLeaveBalance();
const updateMutation = useUpdateLeaveBalance();
const formError = ref<string | null>(null);

function normalizePayload(values: LeaveBalanceFormValues) {
    return {
        employee_id: values.employee_id,
        leave_type: values.leave_type as BalanceLeaveType,
        period_year: values.period_year,
        allocated_days: values.allocated_days,
        notes: values.notes === '' ? null : (values.notes ?? null),
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
            // Update accepts only allocated_days + notes; pass the
            // narrower subset to match the backend's UpdateRequest.
            const res = await updateMutation.mutateAsync({
                id: props.id,
                payload: {
                    allocated_days: payload.allocated_days,
                    notes: payload.notes,
                },
            });
            toast.add({
                severity: 'success',
                summary: t('hrm.leaveBalance.toast.updated'),
                life: 3000,
            });
            void router.push({
                name: HRM_ROUTES.LEAVE_BALANCE_DETAIL,
                params: { id: res.data.id },
            });
        } else {
            const res = await createMutation.mutateAsync(payload);
            toast.add({
                severity: 'success',
                summary: t('hrm.leaveBalance.toast.created'),
                life: 3000,
            });
            void router.push({
                name: HRM_ROUTES.LEAVE_BALANCE_DETAIL,
                params: { id: res.data.id },
            });
        }
    } catch (e: unknown) {
        if (!isAxiosErr(e) || !e.response) {
            formError.value = t('hrm.leaveBalance.form.errors.unknown');
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
            formError.value = t('hrm.leaveBalance.form.errors.forbidden');
            return;
        }

        formError.value = t('hrm.leaveBalance.form.errors.unknown');
    }
});

function onCancel(): void {
    if (isEditMode.value && props.id) {
        void router.push({
            name: HRM_ROUTES.LEAVE_BALANCE_DETAIL,
            params: { id: props.id },
        });
    } else {
        void router.push({ name: HRM_ROUTES.LEAVE_BALANCE_LIST });
    }
}

function navigateToList(): void {
    void router.push({ name: HRM_ROUTES.LEAVE_BALANCE_LIST });
}

const pageTitle = computed<string>(() =>
    isEditMode.value
        ? t('hrm.leaveBalance.form.edit.title')
        : t('hrm.leaveBalance.form.create.title'),
);

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const trail: BreadcrumbItem[] = [
        { label: t('hrm.leaveBalance.breadcrumb.list'), to: { name: HRM_ROUTES.LEAVE_BALANCE_LIST } },
    ];
    if (isEditMode.value) {
        trail.push({
            label: t('hrm.leaveBalance.breadcrumb.edit'),
            to: props.id
                ? { name: HRM_ROUTES.LEAVE_BALANCE_DETAIL, params: { id: String(props.id) } }
                : { name: HRM_ROUTES.LEAVE_BALANCE_LIST },
        });
        trail.push({ label: t('hrm.leaveBalance.breadcrumb.edit') });
    } else {
        trail.push({ label: t('hrm.leaveBalance.breadcrumb.new') });
    }
    return trail;
});

const submitLabel = computed<string>(() => {
    if (isSubmitting.value) {
        return isEditMode.value
            ? t('hrm.leaveBalance.form.edit.submitting')
            : t('hrm.leaveBalance.form.create.submitting');
    }
    return isEditMode.value
        ? t('hrm.leaveBalance.form.edit.submit')
        : t('hrm.leaveBalance.form.create.submit');
});
</script>

<template>
    <PageLayout width="narrow">
        <template v-if="isEditMode && isLoadingEdit">
            <PageHeader
                :title="t('hrm.leaveBalance.form.edit.title')"
                :breadcrumbs="[{ label: t('hrm.leaveBalance.breadcrumb.list'), to: { name: HRM_ROUTES.LEAVE_BALANCE_LIST } }]"
            />
            <LoadingState variant="detail" data-testid="leave-balance-form-loading" />
        </template>

        <template v-else-if="isEditMode && isNotFound">
            <PageHeader
                :title="t('hrm.leaveBalance.notFound.title')"
                :breadcrumbs="[{ label: t('hrm.leaveBalance.breadcrumb.list'), to: { name: HRM_ROUTES.LEAVE_BALANCE_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="leave-balance-form-not-found"
                >
                    <i class="pi pi-compass text-5xl text-text-tertiary" aria-hidden="true"></i>
                    <h2 class="text-xl font-medium text-text-primary">
                        {{ t('hrm.leaveBalance.notFound.title') }}
                    </h2>
                    <p class="max-w-md text-base text-text-secondary">
                        {{ t('hrm.leaveBalance.notFound.description') }}
                    </p>
                    <Button
                        :label="t('hrm.leaveBalance.notFound.action')"
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
                :title="t('hrm.leaveBalance.form.edit.title')"
                :breadcrumbs="[{ label: t('hrm.leaveBalance.breadcrumb.list'), to: { name: HRM_ROUTES.LEAVE_BALANCE_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="leave-balance-form-load-error"
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
                    data-testid="leave-balance-form-error-banner"
                    class="mb-4 rounded-md border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-text"
                >
                    {{ formError }}
                </div>

                <form class="flex flex-col gap-5" novalidate @submit.prevent="onSubmit">
                    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <!-- Employee picker — standalone-chrome FormField
                             (picker emits number|null which doesn't fit
                             the string-typed scoped slot). Disabled in
                             edit mode because employee_id is part of
                             the immutable identity tuple. -->
                        <FormField
                            name="employee_id"
                            :label="t('hrm.leaveBalance.form.fields.employee')"
                            required
                        >
                            <Select
                                :model-value="employeeIdValue"
                                name="employee_id"
                                :options="employeeOptions"
                                option-label="label"
                                option-value="value"
                                :loading="employeesQuery.isLoading.value"
                                :disabled="isEditMode || employeesQuery.isLoading.value"
                                filter
                                class="w-full"
                                data-testid="leave-balance-form-employee"
                                @update:model-value="
                                    (v) => handleEmployeeIdChange(v as number | null)
                                "
                                @blur="() => handleEmployeeIdBlur()"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="leave_type"
                            :label="t('hrm.leaveBalance.form.fields.type')"
                            :help="t('hrm.leaveBalance.form.fields.typeHelp')"
                            required
                        >
                            <Select
                                v-bind="field"
                                :options="leaveTypeOptions"
                                option-label="label"
                                option-value="value"
                                :disabled="isEditMode"
                                class="w-full"
                                data-testid="leave-balance-form-type"
                            />
                        </FormField>

                        <FormField
                            name="period_year"
                            :label="t('hrm.leaveBalance.form.fields.periodYear')"
                            :help="t('hrm.leaveBalance.form.fields.periodYearHelp')"
                            required
                        >
                            <InputNumber
                                :model-value="periodYearValue"
                                name="period_year"
                                :min="2000"
                                :max="2100"
                                :use-grouping="false"
                                show-buttons
                                :disabled="isEditMode"
                                class="w-full"
                                input-class="w-full"
                                data-testid="leave-balance-form-period-year"
                                @update:model-value="(v) => handlePeriodYearChange(v as number | null)"
                                @blur="() => handlePeriodYearBlur()"
                            />
                        </FormField>

                        <FormField
                            name="allocated_days"
                            :label="t('hrm.leaveBalance.form.fields.allocated')"
                            :help="t('hrm.leaveBalance.form.fields.allocatedHelp')"
                            required
                        >
                            <InputNumber
                                :model-value="allocatedDaysValue"
                                name="allocated_days"
                                :min="0"
                                :max="366"
                                :step="0.5"
                                :min-fraction-digits="1"
                                :max-fraction-digits="1"
                                show-buttons
                                class="w-full"
                                input-class="w-full"
                                data-testid="leave-balance-form-allocated"
                                @update:model-value="(v) => handleAllocatedDaysChange(v as number | null)"
                                @blur="() => handleAllocatedDaysBlur()"
                            />
                        </FormField>

                        <div class="sm:col-span-2">
                            <FormField
                                v-slot="{ field }"
                                name="notes"
                                :label="t('hrm.leaveBalance.form.fields.notes')"
                                :help="t('hrm.leaveBalance.form.fields.notesHelp')"
                            >
                                <Textarea
                                    v-bind="field"
                                    rows="3"
                                    class="w-full"
                                    data-testid="leave-balance-form-notes"
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
