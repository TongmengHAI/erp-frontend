<script setup lang="ts">
import axios from 'axios';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useField, useForm } from 'vee-validate';
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
import { useDepartmentsQuery } from '@/modules/hrm/composables/useDepartments';
import { usePositionsQuery } from '@/modules/hrm/composables/usePositions';
import { useBranchesQuery } from '@/modules/hrm/composables/useBranches';
import { useHrmSettingsQuery } from '@/modules/admin/composables/useHrmSettings';
import {
    employeeFormSchemaAutoGen,
    employeeFormSchemaManual,
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
//
// Session 3 — per-company HRM Settings integration:
//   - Fetch settings via useHrmSettingsQuery() on mount.
//   - When create + settings.auto_generate_employee_code = true:
//       • Hide the employee_code free-input.
//       • Render a read-only label ("Code will be auto-generated as
//         {prefix}… when saved.").
//       • OMIT employee_code from the payload — backend's `prohibited`
//         rule must not fire.
//   - When create + auto-gen off: current free-input behavior.
//   - When edit: NEVER apply auto-gen behavior. The employee already
//     has a code; it stays editable.
//   - Default status from settings.default_employee_status (create only).
//     Edit mode keeps the employee's actual status.
//   - Settings loading: chrome renders; code field is the only thing
//     deferred (disabled). Other fields paint immediately.
//   - Settings error (403, network, etc.): non-blocking warning toast
//     once; form falls back to manual-input behavior. Doesn't lock the
//     form.
//   - Mid-edit settings changes don't propagate (settings fetched on
//     mount only). Re-opening the form picks up the new value. v1
//     intentional — real-time multi-tab sync is post-v1 polish.
//
// Schema selection (the load-bearing piece): TWO schemas live in
// employeeFormSchema.ts — `employeeFormSchemaManual` (required
// employee_code) and `employeeFormSchemaAutoGen` (no employee_code key
// at all). The `activeSchema` computed below picks one based on
// `isAutoGenMode`. The `validationSchema` passed to useForm is a
// computed of `toTypedSchema(activeSchema.value)` — VeeValidate's
// documented reactive-schema support means when isAutoGenMode flips,
// the form re-validates against the new schema in a single tick.
// Template rendering, schema validation, and payload shape all key off
// the same `isAutoGenMode` ref → they cannot drift.
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

// ─── Per-company HRM Settings ──────────────────────────────────────────────
// Fetched on mount. The form starts in manual-input mode (defaultInitial
// below) and flips to auto-gen when settings arrive (create-mode only).
//
// Permission note: the show endpoint requires settings.hrm.view. In v1
// the only role granted hrm.employee.create (tenant_admin) also has
// settings.hrm.view, so 403 is theoretical. Future roles (team_lead /
// hrm_manager / etc.) might split the grant — the error fallback
// preserves form usability in that case.
const settingsQuery = useHrmSettingsQuery();
const isSettingsLoading = computed<boolean>(
    () => settingsQuery.isLoading.value,
);
const settingsData = computed(() => settingsQuery.data.value?.data);
const isAutoGenSetting = computed<boolean>(
    () => settingsData.value?.auto_generate_employee_code ?? false,
);
const autoGenPrefix = computed<string>(
    () => settingsData.value?.employee_code_prefix ?? '',
);

// Auto-gen mode applies ONLY in create + when settings says ON. Edit
// mode keeps the existing employee_code editable regardless of the
// tenant-wide flag.
const isAutoGenMode = computed<boolean>(
    () => !isEditMode.value && isAutoGenSetting.value,
);

// One-shot warning toast on settings-query failure. ref() flag prevents
// re-emitting the toast on every reactive recompute or refetch retry.
// immediate: true so a query that's already in error state at mount
// (e.g. a cached failure from a prior page visit) still surfaces the
// toast on this form's first paint.
const hasShownSettingsWarning = ref<boolean>(false);
watch(
    () => settingsQuery.isError.value,
    (errored) => {
        if (!errored || hasShownSettingsWarning.value) return;
        hasShownSettingsWarning.value = true;
        toast.add({
            severity: 'warn',
            summary: t('hrm.employee.form.settingsErrorWarning'),
            life: 5000,
        });
    },
    { immediate: true },
);

// ─── Form state ─────────────────────────────────────────────────────────────
// Manual-input mode is the safe default — the form is usable from first
// paint with no settings response. If settings arrive saying "auto-gen
// is on" (create-mode), the computed validationSchema below switches to
// the auto-gen schema (no employee_code at all), and the conditional
// template renders the read-only label in place of the input.
const defaultInitial: EmployeeFormValues = {
    employee_code: '',
    full_name: '',
    email: '',
    department_id: null,
    branch_id: null,
    position_id: null,
    hire_date: '',
    status: 'active',
};

// Reactive validation schema. VeeValidate re-validates the form when
// this ref's value changes — so when settings resolve and isAutoGenMode
// flips, the form transitions atomically from "code required" to "code
// not part of schema" in a single tick. No mid-state where the visual
// template says auto-gen but validation still demands a code (the bug
// that surfaced when the discriminator lived inside a single schema as
// a synthetic `_autoGen` field — VeeValidate's setValues didn't reliably
// propagate that field, so the schema branch never flipped).
const activeSchema = computed(() =>
    isAutoGenMode.value ? employeeFormSchemaAutoGen : employeeFormSchemaManual,
);

const { handleSubmit, setErrors, setValues, values, isSubmitting } =
    useForm<EmployeeFormValues>({
        validationSchema: computed(() => toTypedSchema(activeSchema.value)),
        initialValues: defaultInitial,
    });

/**
 * Pre-fill the form once edit data arrives. Watch fires exactly once per
 * load (data is stable post-fetch). resetForm would clear dirty state, but
 * since this runs before the user has interacted, setValues is enough.
 *
 * Edit mode always uses the manual schema — the row's existing
 * employee_code is editable; settings.auto_generate doesn't retroactively
 * lock previously-set codes. The `isAutoGenMode` computed already short-
 * circuits on isEditMode, so activeSchema is `manual` here regardless of
 * the tenant flag.
 */
watch(
    () => editData.value?.data,
    (employee) => {
        if (!employee) return;
        setValues({
            employee_code: employee.employee_code,
            full_name: employee.full_name,
            email: employee.email ?? '',
            // Flatten the nested snapshots back to plain ids for the
            // pickers' v-model. null when unassigned OR when the parent
            // row was soft-deleted (backend returns null in both cases).
            department_id: employee.department?.id ?? null,
            branch_id: employee.branch?.id ?? null,
            position_id: employee.position?.id ?? null,
            hire_date: employee.hire_date,
            status: employee.status,
        });
    },
    { immediate: true },
);

/**
 * Apply settings to form state in CREATE mode only. Two effects:
 *   1. Clear employee_code when auto-gen is on (it's not part of the
 *      auto-gen schema and won't be sent — but a stale value left in
 *      form state would still appear if the user toggled OFF mid-edit
 *      in some future iteration; clearing is the safe default).
 *   2. Seed `status` from settings.default_employee_status — the form's
 *      hardcoded 'active' was the previous behavior; this respects an
 *      explicit override from the admin.
 *
 * Edit mode is untouched: the employee's own values (set by the edit
 * watch above) are authoritative.
 *
 * The schema swap (manual ↔ auto-gen) happens automatically via the
 * `activeSchema` computed — VeeValidate re-validates on schema-ref
 * change. No imperative schema-flip needed here.
 *
 * `immediate: true` is load-bearing: TanStack Query returns cached
 * settings synchronously when the admin just visited /admin/hrm/settings,
 * so `settingsData` is already populated when this watcher registers.
 * Without immediate, the watcher would only fire on transitions, and
 * the cached-on-mount case would never run setValues — the form would
 * silently keep defaultInitial.status='active' regardless of the saved
 * default_employee_status. The cold-cache path (settingsData starts
 * undefined) also works: immediate fires once with `s = undefined`
 * (early-returns), then fires again when data lands.
 */
watch(
    settingsData,
    (s) => {
        if (!s || isEditMode.value) return;
        setValues({
            employee_code: s.auto_generate_employee_code
                ? ''
                : (values.employee_code ?? ''),
            full_name: values.full_name,
            email: values.email,
            department_id: values.department_id ?? null,
            branch_id: values.branch_id ?? null,
            position_id: values.position_id ?? null,
            hire_date: values.hire_date,
            status: s.default_employee_status,
        });
    },
    { immediate: true },
);

// ─── Department picker data + binding ──────────────────────────────────────
// per_page: 100 matches the backend's `max:100` cap on the index endpoint.
// Beyond 100 active departments, the picker silently shows the first 100 —
// at that scale the form needs a typeahead instead, which is a follow-up.
// status: 'active' excludes archived departments from the assignable set.
const departmentsQuery = useDepartmentsQuery(() => ({
    status: 'active' as const,
    per_page: 100,
}));

// useField bypass for the department_id picker — FormField's scoped slot
// is typed `string | undefined`, but the picker emits `number | null`.
// Rather than widening FormField (which would fight every existing PV
// InputText consumer), we use FormField in standalone-chrome mode (plain
// default slot, no v-slot) and bind the Select directly to this useField
// call. The form's useForm() context still owns the value (setValues in
// the watch above hydrates this same field state), and the FormField
// wrapper still renders the label + error message via its internal
// useField call on the same name.
const {
    value: departmentIdValue,
    handleChange: handleDepartmentIdChange,
    handleBlur: handleDepartmentIdBlur,
} = useField<number | null>('department_id');

interface DepartmentOption {
    value: number | null;
    label: string;
}
const departmentOptions = computed<DepartmentOption[]>(() => [
    // "— None —" first so clearing is one click. value: null is what the
    // backend wants on the wire; the picker's v-model is null when this
    // option is selected.
    { value: null, label: t('hrm.employee.form.fields.noDepartment') },
    ...(departmentsQuery.data.value?.data ?? []).map((d) => ({
        value: d.id,
        label: d.name,
    })),
]);

// ─── Position picker data + binding ────────────────────────────────────────
// Mirror of the Department picker above. Same per_page: 100 cap and
// "status: 'active'" filter — archived positions don't appear as
// assignable. Same standalone-chrome FormField pattern (the picker
// emits number | null, doesn't fit the scoped-slot string typing).
// The Position picker replaces the old free-text job_title input
// (dropped in Session 2's type cutover).
const positionsQuery = usePositionsQuery(() => ({
    status: 'active' as const,
    per_page: 100,
}));

const {
    value: positionIdValue,
    handleChange: handlePositionIdChange,
    handleBlur: handlePositionIdBlur,
} = useField<number | null>('position_id');

interface PositionOption {
    value: number | null;
    label: string;
}
const positionOptions = computed<PositionOption[]>(() => [
    { value: null, label: t('hrm.employee.form.fields.noPosition') },
    ...(positionsQuery.data.value?.data ?? []).map((p) => ({
        value: p.id,
        label: p.title,
    })),
]);

// ─── Branch picker data + binding ──────────────────────────────────────────
// Same standalone-chrome FormField pattern as Department and Position —
// the picker emits number | null which doesn't fit the string-typed
// scoped slot. Same status: 'active' filter so archived branches don't
// appear as assignable, same per_page: 100 cap as the other pickers.
const branchesQuery = useBranchesQuery(() => ({
    status: 'active' as const,
    per_page: 100,
}));

const {
    value: branchIdValue,
    handleChange: handleBranchIdChange,
    handleBlur: handleBranchIdBlur,
} = useField<number | null>('branch_id');

interface BranchOption {
    value: number | null;
    label: string;
}
const branchOptions = computed<BranchOption[]>(() => [
    { value: null, label: t('hrm.employee.form.fields.noBranch') },
    ...(branchesQuery.data.value?.data ?? []).map((b) => ({
        value: b.id,
        // Branch options show "Name — City" when city is present so
        // disambiguation works at a glance (e.g. two "Phnom Penh" branches
        // in different sub-locations). Pure name fallback when city is
        // null.
        label: b.city ? `${b.name} — ${b.city}` : b.name,
    })),
]);

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

/**
 * Build the wire payload from form values.
 *
 * Two important transforms:
 *   - `employee_code` is OMITTED from the payload when isAutoGenMode is
 *     true (the backend's StoreEmployeeRequest treats it as `prohibited`
 *     in that mode; sending '' or null would still trigger 422). The
 *     payload is computed at submit time off the live mode flag — the
 *     same flag that selects the schema and the template branch, so
 *     they cannot drift.
 *   - empty-string → null for nullable optional fields (email).
 *     department_id is already number-or-null from the picker.
 */
function normalizePayload(vals: EmployeeFormValues) {
    const base = {
        full_name: vals.full_name,
        email: vals.email === '' ? null : vals.email,
        department_id: vals.department_id ?? null,
        branch_id: vals.branch_id ?? null,
        position_id: vals.position_id ?? null,
        hire_date: vals.hire_date,
        status: vals.status as EmployeeStatus,
    };

    if (isAutoGenMode.value) {
        // employee_code intentionally OMITTED — backend's prohibited rule.
        return base;
    }

    return {
        ...base,
        employee_code: vals.employee_code ?? '',
    };
}

function isAxiosErr(e: unknown): e is import('axios').AxiosError<ApiErrorBody> {
    return axios.isAxiosError(e);
}

const onSubmit = handleSubmit(async (vals) => {
    formError.value = null;
    const payload = normalizePayload(vals);

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

// Auto-gen read-only label text — interpolates the prefix from settings.
// "Code will be auto-generated as TT-… when saved."
const autoGenLabelText = computed<string>(() =>
    t('hrm.employee.form.fields.codeAutoGenerated', {
        prefix: autoGenPrefix.value,
    }),
);

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
                        <!--
                          employee_code — three branches:
                            1. Settings loading: disabled InputText with the
                               loading state. Chrome paints; the user just
                               can't type the code until we know whether
                               auto-gen is on.
                            2. Auto-gen ON (settings loaded, create mode):
                               read-only label, no input. Backend assigns
                               the code at submit time.
                            3. Auto-gen OFF (settings loaded OR error
                               fallback, OR edit mode): free-input
                               (today's behavior, required by schema).
                        -->
                        <FormField
                            v-if="!isEditMode && isSettingsLoading"
                            name="employee_code"
                            :label="t('hrm.employee.form.fields.code')"
                            :help="t('hrm.employee.form.fields.codeLoading')"
                            required
                        >
                            <InputText
                                model-value=""
                                disabled
                                class="w-full"
                                autocomplete="off"
                                data-testid="employee-form-code"
                            />
                        </FormField>

                        <FormField
                            v-else-if="isAutoGenMode"
                            name="employee_code"
                            :label="t('hrm.employee.form.fields.code')"
                            :help="t('hrm.employee.form.fields.codeAutoGeneratedHelp')"
                        >
                            <div
                                class="flex h-10 items-center rounded-md border border-border-default bg-surface-sunken px-3 text-sm text-text-secondary"
                                data-testid="employee-form-code-auto"
                            >
                                {{ autoGenLabelText }}
                            </div>
                        </FormField>

                        <FormField
                            v-else
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

                        <!-- Cross-module picker order: Department →
                             Branch → Position. Matches the column order
                             on the Employee list (dept then branch then
                             pos), so the user's left-to-right scan in
                             the form mirrors what they'll see in the
                             list afterwards. Three pickers, all using
                             the same standalone-chrome FormField
                             pattern: picker emits number|null which
                             doesn't fit the string-typed scoped slot,
                             so PV Select is bound directly to the
                             useField('{name}_id') above. Each picker
                             filters status='active' so archived rows
                             never appear as assignable. -->
                        <FormField
                            name="department_id"
                            :label="t('hrm.employee.form.fields.department')"
                        >
                            <Select
                                :model-value="departmentIdValue"
                                name="department_id"
                                :options="departmentOptions"
                                option-label="label"
                                option-value="value"
                                :loading="departmentsQuery.isLoading.value"
                                :disabled="departmentsQuery.isLoading.value"
                                class="w-full"
                                data-testid="employee-form-department"
                                @update:model-value="
                                    (v) => handleDepartmentIdChange(v as number | null)
                                "
                                @blur="() => handleDepartmentIdBlur()"
                            />
                        </FormField>

                        <FormField
                            name="branch_id"
                            :label="t('hrm.employee.form.fields.branch')"
                            :help="t('hrm.employee.form.fields.branchHelp')"
                        >
                            <Select
                                :model-value="branchIdValue"
                                name="branch_id"
                                :options="branchOptions"
                                option-label="label"
                                option-value="value"
                                :loading="branchesQuery.isLoading.value"
                                :disabled="branchesQuery.isLoading.value"
                                filter
                                class="w-full"
                                data-testid="employee-form-branch"
                                @update:model-value="
                                    (v) => handleBranchIdChange(v as number | null)
                                "
                                @blur="() => handleBranchIdBlur()"
                            />
                        </FormField>

                        <FormField
                            name="position_id"
                            :label="t('hrm.employee.form.fields.position')"
                            :help="t('hrm.employee.form.fields.positionHelp')"
                        >
                            <Select
                                :model-value="positionIdValue"
                                name="position_id"
                                :options="positionOptions"
                                option-label="label"
                                option-value="value"
                                :loading="positionsQuery.isLoading.value"
                                :disabled="positionsQuery.isLoading.value"
                                filter
                                class="w-full"
                                data-testid="employee-form-position"
                                @update:model-value="
                                    (v) => handlePositionIdChange(v as number | null)
                                "
                                @blur="() => handlePositionIdBlur()"
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
