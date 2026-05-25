<script setup lang="ts">
import axios from 'axios';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRouter } from 'vue-router';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import CardSection from '@/shared/components/layout/CardSection.vue';
import LoadingState from '@/shared/components/state/LoadingState.vue';
import ErrorState from '@/shared/components/state/ErrorState.vue';
import StatusBadge, {
    type StatusSeverity,
} from '@/shared/components/data-display/StatusBadge.vue';
import DateDisplay from '@/shared/components/data-display/DateDisplay.vue';
import {
    useDeleteEmployee,
    useEmployeeQuery,
} from '@/modules/hrm/composables/useEmployees';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type { EmployeeStatus } from '@/modules/hrm/types/employee';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';

// ─────────────────────────────────────────────────────────────────────────────
// EmployeeDetailPage — single-employee view, route param drives the query.
//
// `id` is passed in via the route's `props: (route) => ({ id: Number(... )})`
// declaration in modules/hrm/routes.ts. Direct URL access (typing
// /hrm/employees/42 into the address bar) works the same as navigating
// from the list — the route guard handles auth + the query handles fetch.
//
// 404 path: when the backend returns 404 (id doesn't exist, soft-deleted,
// or in another tenant/company), the query's `isError` flips and we render
// a not-found card with a "back to list" link. Distinguished from generic
// errors (network, 5xx) by inspecting the axios response status.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    /** Resolved from the route via `props: (route) => ({ id: ... })`. */
    id: number;
}
const props = defineProps<Props>();

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const { confirmDelete } = useAppConfirm();

const { data, isLoading, isError, error, refetch } = useEmployeeQuery(
    () => props.id,
);
const deleteMutation = useDeleteEmployee();

const employee = computed(() => data.value?.data ?? null);

/**
 * 404 vs generic-error split. Axios attaches the response to the thrown
 * error; a 404 means the id doesn't exist (or the row is hidden by the
 * tenant/company scope on the backend — either way, "not here").
 * Anything else (network, 5xx, 401 caught by other layers) is a generic
 * retry-able error.
 */
const isNotFound = computed<boolean>(() => {
    if (!isError.value) return false;
    const err = error.value;
    if (axios.isAxiosError(err)) {
        return err.response?.status === 404;
    }
    return false;
});

const isGenericError = computed<boolean>(() => isError.value && !isNotFound.value);

const canEdit = computed<boolean>(() => auth.can('hrm.employee.update'));
const canDelete = computed<boolean>(() => auth.can('hrm.employee.delete'));

function statusSeverity(status: EmployeeStatus): StatusSeverity {
    switch (status) {
        case 'active':
            return 'success';
        case 'on_leave':
            return 'warning';
        case 'terminated':
            return 'neutral';
    }
}

function statusLabel(status: EmployeeStatus): string {
    return t(`hrm.employee.status.${status}`);
}

const breadcrumbs = computed(() => [
    { label: t('hrm.employee.breadcrumb.list'), to: { name: HRM_ROUTES.EMPLOYEE_LIST } },
    {
        label: employee.value?.full_name ?? t('hrm.employee.breadcrumb.list'),
    },
]);

function navigateToList(): void {
    void router.push({ name: HRM_ROUTES.EMPLOYEE_LIST });
}

function navigateToEdit(): void {
    if (!employee.value) return;
    void router.push({
        name: HRM_ROUTES.EMPLOYEE_EDIT,
        params: { id: employee.value.id },
    });
}

/**
 * Delete flow: confirm → mutate → toast → route back to list.
 * Mutation errors surface as a danger toast and leave the user on the
 * detail page. The composable invalidates the employee queryKey on
 * success so the list re-fetches automatically.
 */
function onDelete(): void {
    if (!employee.value) return;
    const current = employee.value;
    confirmDelete({
        message: t('hrm.employee.delete.confirmMessage', { name: current.full_name }),
        acceptLabel: t('hrm.employee.delete.confirmAction'),
        onAccept: async () => {
            try {
                await deleteMutation.mutateAsync(current.id);
                toast.add({
                    severity: 'success',
                    summary: t('hrm.employee.delete.toast.success'),
                    life: 3000,
                });
                void router.push({ name: HRM_ROUTES.EMPLOYEE_LIST });
            } catch {
                toast.add({
                    severity: 'error',
                    summary: t('hrm.employee.delete.toast.error'),
                    life: 4000,
                });
            }
        },
    });
}
</script>

<template>
    <PageLayout width="narrow">
        <!-- Loading: render skeleton chrome AND the page header in a
             holding state. The header doesn't have the employee name yet
             so we show a placeholder title. -->
        <template v-if="isLoading">
            <PageHeader
                :title="t('hrm.employee.breadcrumb.list')"
                :breadcrumbs="[{ label: t('hrm.employee.breadcrumb.list'), to: { name: HRM_ROUTES.EMPLOYEE_LIST } }]"
            />
            <LoadingState variant="detail" data-testid="employee-detail-loading" />
        </template>

        <!-- Not found: stand-alone card, no chrome actions. Distinguished
             from generic error so a stale URL doesn't show a retry button
             that would just re-issue the same 404. -->
        <template v-else-if="isNotFound">
            <PageHeader
                :title="t('hrm.employee.notFound.title')"
                :breadcrumbs="[{ label: t('hrm.employee.breadcrumb.list'), to: { name: HRM_ROUTES.EMPLOYEE_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="employee-detail-not-found"
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
                        data-testid="employee-detail-back-to-list"
                        @click="navigateToList"
                    />
                </div>
            </CardSection>
        </template>

        <!-- Generic error: retry-able. Stays within the page chrome so the
             user retains navigation context. -->
        <template v-else-if="isGenericError">
            <PageHeader
                :title="t('hrm.employee.breadcrumb.list')"
                :breadcrumbs="[{ label: t('hrm.employee.breadcrumb.list'), to: { name: HRM_ROUTES.EMPLOYEE_LIST } }]"
            />
            <CardSection>
                <ErrorState data-testid="employee-detail-error" @retry="refetch" />
            </CardSection>
        </template>

        <!-- Populated: header + details card. -->
        <template v-else-if="employee">
            <PageHeader :title="employee.full_name" :breadcrumbs="breadcrumbs">
                <template #actions>
                    <Button
                        v-if="canEdit"
                        :label="t('hrm.employee.detail.edit')"
                        icon="pi pi-pencil"
                        severity="secondary"
                        data-testid="employee-detail-edit-button"
                        @click="navigateToEdit"
                    />
                    <Button
                        v-if="canDelete"
                        :label="t('hrm.employee.detail.delete')"
                        icon="pi pi-trash"
                        severity="danger"
                        :loading="deleteMutation.isPending.value"
                        data-testid="employee-detail-delete-button"
                        @click="onDelete"
                    />
                </template>
            </PageHeader>

            <CardSection :title="t('hrm.employee.detail.sections.details')">
                <dl class="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.employee.detail.fields.code') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary tabular-nums"
                            data-testid="employee-detail-code"
                        >
                            {{ employee.employee_code }}
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.employee.detail.fields.fullName') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="employee-detail-name"
                        >
                            {{ employee.full_name }}
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.employee.detail.fields.email') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="employee-detail-email"
                        >
                            <a
                                v-if="employee.email"
                                :href="`mailto:${employee.email}`"
                                class="text-brand hover:underline"
                            >{{ employee.email }}</a>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.employee.detail.noEmail') }}
                            </span>
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.employee.detail.fields.jobTitle') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="employee-detail-job-title"
                        >
                            <span v-if="employee.job_title">{{ employee.job_title }}</span>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.employee.detail.noJobTitle') }}
                            </span>
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.employee.detail.fields.department') }}
                        </dt>
                        <dd
                            class="mt-1 text-base"
                            data-testid="employee-detail-department"
                        >
                            <!-- Department name links to the Department detail
                                 page — natural cross-module drill-down. The
                                 RouterLink uses the named route so any future
                                 URL change to /hrm/departments/:id ripples
                                 through automatically. Null renders as "—"
                                 (also covers the soft-deleted-department
                                 case — backend returns department: null
                                 when the parent row is trashed). -->
                            <RouterLink
                                v-if="employee.department"
                                :to="{
                                    name: HRM_ROUTES.DEPARTMENT_DETAIL,
                                    params: { id: employee.department.id },
                                }"
                                class="text-brand hover:underline focus:outline-none focus:underline"
                                :data-testid="`employee-detail-department-link-${employee.department.id}`"
                            >
                                {{ employee.department.name }}
                            </RouterLink>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.employee.detail.noDepartment') }}
                            </span>
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.employee.detail.fields.hireDate') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="employee-detail-hire-date"
                        >
                            <DateDisplay :date="employee.hire_date" format="long" />
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.employee.detail.fields.status') }}
                        </dt>
                        <dd class="mt-1" data-testid="employee-detail-status">
                            <StatusBadge
                                :severity="statusSeverity(employee.status)"
                                :label="statusLabel(employee.status)"
                            />
                        </dd>
                    </div>
                </dl>
            </CardSection>
        </template>
    </PageLayout>
</template>
