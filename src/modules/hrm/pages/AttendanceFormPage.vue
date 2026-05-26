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
    useAttendanceDetailQuery,
    useCreateAttendance,
    useUpdateAttendance,
} from '@/modules/hrm/composables/useAttendance';
import { useEmployeesQuery } from '@/modules/hrm/composables/useEmployees';
import {
    attendanceFormSchema,
    type AttendanceFormValues,
} from '@/modules/hrm/schemas/attendanceFormSchema';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type { ApiErrorBody } from '@/modules/auth/types';
import {
    ATTENDANCE_STATUSES,
    type AttendanceStatus,
} from '@/modules/hrm/types/attendance';
import {
    dateToYYYYMMDD,
    stringToDate,
} from '@/modules/hrm/utils/dateConversion';
import {
    dateToHHMMSS,
    stringToTime,
} from '@/modules/hrm/utils/timeConversion';
import type { BreadcrumbItem } from '@/shared/types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// AttendanceFormPage — create AND edit, mode determined by route name.
//
//   /hrm/attendance/new       → HRM_ROUTES.ATTENDANCE_NEW   → create
//   /hrm/attendance/:id/edit  → HRM_ROUTES.ATTENDANCE_EDIT  → edit
//
// THE TIME-PICKER BINDING PATTERN (the slice's load-bearing UX piece):
//   <DatePicker
//     :model-value="stringToTime(field.modelValue)"
//     time-only
//     hour-format="24"
//     @update:model-value="(d) => field['onUpdate:modelValue'](dateToHHMMSS(d))"
//   />
//
// This is the EXACT same shape as the hire_date binding from Employee
// Day 6. NOT v-bind="field" on a PrimeVue component — that was the
// broken pattern that surfaced as Bug 3 on Employee. The form state
// holds HH:MM:SS strings, the picker speaks Date objects, the manual
// wiring bridges both directions. timeConversion's util output is
// byte-identical to the backend's wire format (confirmed in Session 2's
// spike).
//
// 422 handling: standard setErrors pattern. The uniqueness conflict
// returns errors.date with the named-fields message "Attendance for
// {employee name} on {date} already exists." — that's longer than
// typical field errors. The FormField wrapper renders the error in
// a `<p>` block under the input which wraps naturally; verified
// during the browser walkthrough that no truncation or layout break
// occurs.
//
// The clock-order check is enforced in THREE places:
//   1. Zod schema's .refine (this form, before submit) — surfaces as
//      errors.clock_out inline before any API call
//   2. Backend FormRequest after() closure — same message
//   3. DB CHECK constraint — final backstop
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
    () => route.name === HRM_ROUTES.ATTENDANCE_EDIT,
);

// ─── Edit-mode data load ────────────────────────────────────────────────────
const {
    data: editData,
    isLoading: isLoadingEdit,
    isError: isEditError,
    error: editError,
} = useAttendanceDetailQuery(() => props.id ?? 0);

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
const defaultInitial: AttendanceFormValues = {
    employee_id: 0, // 0 is invalid via Zod positive() — forces a real pick
    date: '',
    clock_in: '',
    clock_out: '',
    status: 'present',
    notes: '',
};

const { handleSubmit, setErrors, setValues, isSubmitting } =
    useForm<AttendanceFormValues>({
        validationSchema: toTypedSchema(attendanceFormSchema),
        initialValues: defaultInitial,
    });

watch(
    () => editData.value?.data,
    (record) => {
        if (!record) return;
        setValues({
            // Employee may be null (soft-deleted parent) — surface 0 so
            // the picker shows the placeholder. Schema's positive() check
            // blocks submit until the user picks a different employee.
            employee_id: record.employee?.id ?? 0,
            date: record.date,
            // Clock times may be null on the API for absent / on_leave
            // records — coerce to '' so the picker shows empty.
            clock_in: record.clock_in ?? '',
            clock_out: record.clock_out ?? '',
            status: record.status,
            notes: record.notes ?? '',
        });
    },
    { immediate: true },
);

// ─── Employee picker data ───────────────────────────────────────────────────
const employeesQuery = useEmployeesQuery(() => ({
    status: 'active' as const,
    per_page: 100,
}));

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

// ─── Status options ─────────────────────────────────────────────────────────
interface StatusOption {
    value: AttendanceStatus;
    label: string;
}
const statusOptions = computed<StatusOption[]>(() =>
    ATTENDANCE_STATUSES.map((s) => ({
        value: s,
        label: t(`hrm.attendance.status.${s}`),
    })),
);

// ─── Mutations + submit ─────────────────────────────────────────────────────
const createMutation = useCreateAttendance();
const updateMutation = useUpdateAttendance();
const formError = ref<string | null>(null);

function normalizePayload(values: AttendanceFormValues) {
    // Empty strings → null on the wire. The backend's TIME columns are
    // nullable for absent / on_leave records; notes is nullable too.
    return {
        employee_id: values.employee_id,
        date: values.date,
        clock_in: values.clock_in === '' ? null : (values.clock_in ?? null),
        clock_out: values.clock_out === '' ? null : (values.clock_out ?? null),
        status: values.status as AttendanceStatus,
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
            const res = await updateMutation.mutateAsync({
                id: props.id,
                payload,
            });
            toast.add({
                severity: 'success',
                summary: t('hrm.attendance.toast.updated'),
                life: 3000,
            });
            void router.push({
                name: HRM_ROUTES.ATTENDANCE_DETAIL,
                params: { id: res.data.id },
            });
        } else {
            const res = await createMutation.mutateAsync(payload);
            toast.add({
                severity: 'success',
                summary: t('hrm.attendance.toast.created'),
                life: 3000,
            });
            void router.push({
                name: HRM_ROUTES.ATTENDANCE_DETAIL,
                params: { id: res.data.id },
            });
        }
    } catch (e: unknown) {
        if (!isAxiosErr(e) || !e.response) {
            formError.value = t('hrm.attendance.form.errors.unknown');
            return;
        }
        const status = e.response.status;
        const body = e.response.data;

        if (status === 422 && body?.errors) {
            // Standard field-error mapping. The uniqueness conflict
            // lands here under errors.date with the named-fields
            // message; the form surfaces it inline via the date
            // FormField's error slot.
            const fieldErrors: Record<string, string> = {};
            for (const [field, msgs] of Object.entries(body.errors)) {
                if (msgs && msgs.length > 0) fieldErrors[field] = msgs[0];
            }
            setErrors(fieldErrors);
            return;
        }

        if (status === 403) {
            formError.value = t('hrm.attendance.form.errors.forbidden');
            return;
        }

        formError.value = t('hrm.attendance.form.errors.unknown');
    }
});

function onCancel(): void {
    if (isEditMode.value && props.id) {
        void router.push({
            name: HRM_ROUTES.ATTENDANCE_DETAIL,
            params: { id: props.id },
        });
    } else {
        void router.push({ name: HRM_ROUTES.ATTENDANCE_LIST });
    }
}

function navigateToList(): void {
    void router.push({ name: HRM_ROUTES.ATTENDANCE_LIST });
}

// ─── Page chrome bindings ───────────────────────────────────────────────────
const pageTitle = computed<string>(() =>
    isEditMode.value
        ? t('hrm.attendance.form.edit.title')
        : t('hrm.attendance.form.create.title'),
);

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const trail: BreadcrumbItem[] = [
        { label: t('hrm.attendance.breadcrumb.list'), to: { name: HRM_ROUTES.ATTENDANCE_LIST } },
    ];
    if (isEditMode.value) {
        trail.push({
            label: editData.value?.data.employee?.full_name ?? t('hrm.attendance.breadcrumb.edit'),
            to: props.id
                ? { name: HRM_ROUTES.ATTENDANCE_DETAIL, params: { id: String(props.id) } }
                : { name: HRM_ROUTES.ATTENDANCE_LIST },
        });
        trail.push({ label: t('hrm.attendance.breadcrumb.edit') });
    } else {
        trail.push({ label: t('hrm.attendance.breadcrumb.new') });
    }
    return trail;
});

const submitLabel = computed<string>(() => {
    if (isSubmitting.value) {
        return isEditMode.value
            ? t('hrm.attendance.form.edit.submitting')
            : t('hrm.attendance.form.create.submitting');
    }
    return isEditMode.value
        ? t('hrm.attendance.form.edit.submit')
        : t('hrm.attendance.form.create.submit');
});
</script>

<template>
    <PageLayout width="narrow">
        <!-- Edit-mode loading. -->
        <template v-if="isEditMode && isLoadingEdit">
            <PageHeader
                :title="t('hrm.attendance.form.edit.title')"
                :breadcrumbs="[{ label: t('hrm.attendance.breadcrumb.list'), to: { name: HRM_ROUTES.ATTENDANCE_LIST } }]"
            />
            <LoadingState variant="detail" data-testid="attendance-form-loading" />
        </template>

        <template v-else-if="isEditMode && isNotFound">
            <PageHeader
                :title="t('hrm.attendance.notFound.title')"
                :breadcrumbs="[{ label: t('hrm.attendance.breadcrumb.list'), to: { name: HRM_ROUTES.ATTENDANCE_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="attendance-form-not-found"
                >
                    <i class="pi pi-compass text-5xl text-text-tertiary" aria-hidden="true"></i>
                    <h2 class="text-xl font-medium text-text-primary">
                        {{ t('hrm.attendance.notFound.title') }}
                    </h2>
                    <p class="max-w-md text-base text-text-secondary">
                        {{ t('hrm.attendance.notFound.description') }}
                    </p>
                    <Button
                        :label="t('hrm.attendance.notFound.action')"
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
                :title="t('hrm.attendance.form.edit.title')"
                :breadcrumbs="[{ label: t('hrm.attendance.breadcrumb.list'), to: { name: HRM_ROUTES.ATTENDANCE_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="attendance-form-load-error"
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
                    data-testid="attendance-form-error-banner"
                    class="mb-4 rounded-md border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-text"
                >
                    {{ formError }}
                </div>

                <form class="flex flex-col gap-5" novalidate @submit.prevent="onSubmit">
                    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField
                            name="employee_id"
                            :label="t('hrm.attendance.form.fields.employee')"
                            required
                        >
                            <Select
                                :model-value="employeeIdValue || null"
                                name="employee_id"
                                :options="employeeOptions"
                                option-label="label"
                                option-value="value"
                                :placeholder="t('hrm.attendance.form.fields.noEmployee')"
                                :loading="employeesQuery.isLoading.value"
                                :disabled="employeesQuery.isLoading.value"
                                filter
                                class="w-full"
                                data-testid="attendance-form-employee"
                                @update:model-value="
                                    (v) => handleEmployeeIdChange((v as number | null) ?? 0)
                                "
                                @blur="() => handleEmployeeIdBlur()"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="date"
                            :label="t('hrm.attendance.form.fields.date')"
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
                                data-testid="attendance-form-date"
                                @update:model-value="
                                    (d) =>
                                        field['onUpdate:modelValue'](
                                            dateToYYYYMMDD(d as Date | null),
                                        )
                                "
                                @blur="field.onBlur"
                            />
                        </FormField>

                        <!-- Clock in — the slice's load-bearing time-picker
                             binding. SAME shape as hire_date above: explicit
                             conversion-wrapped binding, NOT v-bind="field"
                             (which is the broken pattern from Employee Bug 3).
                             timeConversion's stringToTime / dateToHHMMSS
                             round-trips byte-identically to the backend
                             (confirmed in Session 2's wire-format spike). -->
                        <FormField
                            v-slot="{ field }"
                            name="clock_in"
                            :label="t('hrm.attendance.form.fields.clockIn')"
                            :help="t('hrm.attendance.form.fields.clockHelp')"
                        >
                            <DatePicker
                                :model-value="stringToTime(field.modelValue)"
                                :name="field.name"
                                time-only
                                hour-format="24"
                                show-icon
                                icon="pi pi-clock"
                                show-button-bar
                                class="w-full"
                                input-class="w-full"
                                data-testid="attendance-form-clock-in"
                                @update:model-value="
                                    (d) =>
                                        field['onUpdate:modelValue'](
                                            dateToHHMMSS(d as Date | null) ?? '',
                                        )
                                "
                                @blur="field.onBlur"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="clock_out"
                            :label="t('hrm.attendance.form.fields.clockOut')"
                            :help="t('hrm.attendance.form.fields.clockHelp')"
                        >
                            <DatePicker
                                :model-value="stringToTime(field.modelValue)"
                                :name="field.name"
                                time-only
                                hour-format="24"
                                show-icon
                                icon="pi pi-clock"
                                show-button-bar
                                class="w-full"
                                input-class="w-full"
                                data-testid="attendance-form-clock-out"
                                @update:model-value="
                                    (d) =>
                                        field['onUpdate:modelValue'](
                                            dateToHHMMSS(d as Date | null) ?? '',
                                        )
                                "
                                @blur="field.onBlur"
                            />
                        </FormField>

                        <FormField
                            v-slot="{ field }"
                            name="status"
                            :label="t('hrm.attendance.form.fields.status')"
                            required
                        >
                            <Select
                                v-bind="field"
                                :options="statusOptions"
                                option-label="label"
                                option-value="value"
                                class="w-full"
                                data-testid="attendance-form-status"
                            />
                        </FormField>

                        <div class="sm:col-span-2">
                            <FormField
                                v-slot="{ field }"
                                name="notes"
                                :label="t('hrm.attendance.form.fields.notes')"
                                :help="t('hrm.attendance.form.fields.notesHelp')"
                            >
                                <Textarea
                                    v-bind="field"
                                    rows="3"
                                    class="w-full"
                                    auto-resize
                                    data-testid="attendance-form-notes"
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
