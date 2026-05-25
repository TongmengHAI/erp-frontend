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
import {
    useDeleteDepartment,
    useDepartmentQuery,
} from '@/modules/hrm/composables/useDepartments';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type { DepartmentStatus } from '@/modules/hrm/types/department';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';

// ─────────────────────────────────────────────────────────────────────────────
// DepartmentDetailPage — direct transposition of EmployeeDetailPage.
//
// Same 404-vs-generic-error split, same delete-with-confirm flow,
// same loading / populated / error branches. Field grid renders the
// four department fields (code, name, description, status) plus
// timestamps; no hire-date variant.
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

const { data, isLoading, isError, error, refetch } = useDepartmentQuery(
    () => props.id,
);
const deleteMutation = useDeleteDepartment();

const department = computed(() => data.value?.data ?? null);

const isNotFound = computed<boolean>(() => {
    if (!isError.value) return false;
    const err = error.value;
    if (axios.isAxiosError(err)) {
        return err.response?.status === 404;
    }
    return false;
});

const isGenericError = computed<boolean>(() => isError.value && !isNotFound.value);

const canEdit = computed<boolean>(() => auth.can('hrm.department.update'));
const canDelete = computed<boolean>(() => auth.can('hrm.department.delete'));

function statusSeverity(status: DepartmentStatus): StatusSeverity {
    switch (status) {
        case 'active':
            return 'success';
        case 'archived':
            return 'neutral';
    }
}

function statusLabel(status: DepartmentStatus): string {
    return t(`hrm.department.status.${status}`);
}

const breadcrumbs = computed(() => [
    { label: t('hrm.department.breadcrumb.list'), to: { name: HRM_ROUTES.DEPARTMENT_LIST } },
    {
        label: department.value?.name ?? t('hrm.department.breadcrumb.list'),
    },
]);

function navigateToList(): void {
    void router.push({ name: HRM_ROUTES.DEPARTMENT_LIST });
}

function navigateToEdit(): void {
    if (!department.value) return;
    void router.push({
        name: HRM_ROUTES.DEPARTMENT_EDIT,
        params: { id: department.value.id },
    });
}

function onDelete(): void {
    if (!department.value) return;
    const current = department.value;
    confirmDelete({
        message: t('hrm.department.delete.confirmMessage', { name: current.name }),
        acceptLabel: t('hrm.department.delete.confirmAction'),
        onAccept: async () => {
            try {
                await deleteMutation.mutateAsync(current.id);
                toast.add({
                    severity: 'success',
                    summary: t('hrm.department.delete.toast.success'),
                    life: 3000,
                });
                void router.push({ name: HRM_ROUTES.DEPARTMENT_LIST });
            } catch {
                toast.add({
                    severity: 'error',
                    summary: t('hrm.department.delete.toast.error'),
                    life: 4000,
                });
            }
        },
    });
}
</script>

<template>
    <PageLayout width="narrow">
        <template v-if="isLoading">
            <PageHeader
                :title="t('hrm.department.breadcrumb.list')"
                :breadcrumbs="[{ label: t('hrm.department.breadcrumb.list'), to: { name: HRM_ROUTES.DEPARTMENT_LIST } }]"
            />
            <LoadingState variant="detail" data-testid="department-detail-loading" />
        </template>

        <template v-else-if="isNotFound">
            <PageHeader
                :title="t('hrm.department.notFound.title')"
                :breadcrumbs="[{ label: t('hrm.department.breadcrumb.list'), to: { name: HRM_ROUTES.DEPARTMENT_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="department-detail-not-found"
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
                        data-testid="department-detail-back-to-list"
                        @click="navigateToList"
                    />
                </div>
            </CardSection>
        </template>

        <template v-else-if="isGenericError">
            <PageHeader
                :title="t('hrm.department.breadcrumb.list')"
                :breadcrumbs="[{ label: t('hrm.department.breadcrumb.list'), to: { name: HRM_ROUTES.DEPARTMENT_LIST } }]"
            />
            <CardSection>
                <ErrorState data-testid="department-detail-error" @retry="refetch" />
            </CardSection>
        </template>

        <template v-else-if="department">
            <PageHeader :title="department.name" :breadcrumbs="breadcrumbs">
                <template #actions>
                    <Button
                        v-if="canEdit"
                        :label="t('hrm.department.detail.edit')"
                        icon="pi pi-pencil"
                        severity="secondary"
                        data-testid="department-detail-edit-button"
                        @click="navigateToEdit"
                    />
                    <Button
                        v-if="canDelete"
                        :label="t('hrm.department.detail.delete')"
                        icon="pi pi-trash"
                        severity="danger"
                        :loading="deleteMutation.isPending.value"
                        data-testid="department-detail-delete-button"
                        @click="onDelete"
                    />
                </template>
            </PageHeader>

            <CardSection :title="t('hrm.department.detail.sections.details')">
                <dl class="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.department.detail.fields.code') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary tabular-nums"
                            data-testid="department-detail-code"
                        >
                            {{ department.code }}
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.department.detail.fields.name') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="department-detail-name"
                        >
                            {{ department.name }}
                        </dd>
                    </div>

                    <div class="sm:col-span-2">
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.department.detail.fields.description') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="department-detail-description"
                        >
                            <span v-if="department.description">{{ department.description }}</span>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.department.detail.noDescription') }}
                            </span>
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.department.detail.fields.status') }}
                        </dt>
                        <dd class="mt-1" data-testid="department-detail-status">
                            <StatusBadge
                                :severity="statusSeverity(department.status)"
                                :label="statusLabel(department.status)"
                            />
                        </dd>
                    </div>
                </dl>
            </CardSection>

            <!-- Employees section. Count comes pre-computed from the
                 server (DepartmentResource's employees_count, populated
                 via withCount). The "View employees" link navigates to
                 the Employee list filtered by this department's id —
                 reuses the same ?department_id= filter the chip on that
                 page reads, single source of truth for the filtered
                 view. No embedded employee list; thin twin, one
                 affordance per concern. -->
            <CardSection
                :title="t('hrm.department.detail.sections.employees')"
                class="mt-4"
            >
                <div class="flex items-center justify-between gap-4">
                    <p class="text-base text-text-secondary" data-testid="department-detail-employees-count">
                        {{ t('hrm.department.detail.employeesCount', department.employees_count, {
                            named: { n: department.employees_count },
                        }) }}
                    </p>
                    <RouterLink
                        v-if="department.employees_count > 0"
                        :to="{
                            name: HRM_ROUTES.EMPLOYEE_LIST,
                            query: { department_id: department.id },
                        }"
                        class="inline-flex items-center gap-1 text-brand hover:underline focus:outline-none focus:underline"
                        data-testid="department-detail-view-employees"
                    >
                        {{ t('hrm.department.detail.viewEmployees') }}
                        <i class="pi pi-arrow-right text-xs" aria-hidden="true"></i>
                    </RouterLink>
                </div>
            </CardSection>
        </template>
    </PageLayout>
</template>
