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
    useDeletePosition,
    usePositionQuery,
} from '@/modules/hrm/composables/usePositions';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type { PositionStatus } from '@/modules/hrm/types/position';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';

// ─────────────────────────────────────────────────────────────────────────────
// PositionDetailPage — direct transposition of DepartmentDetailPage,
// including the "Employees with this position" section. Same shape,
// same 404-vs-generic-error split, same delete-with-confirm flow.
//
// The "View employees" RouterLink navigates to /hrm/employees with
// `query: { position_id: position.id }`. Same shape as the Department
// equivalent — Vue Router's RouterLink with `query: { ... }` REPLACES
// the entire query object, so any prior ?department_id= is dropped on
// navigation. This matches Department's pre-existing behavior and is
// the right cut: cross-module deep-link starts a fresh filter context.
// Once the user is on the Employee list page, both chips render
// independently when both URL params are present (AND filter), with
// per-chip clear() removing only its own param.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    id: number;
}
const props = defineProps<Props>();

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const { confirmDelete } = useAppConfirm();

const { data, isLoading, isError, error, refetch } = usePositionQuery(
    () => props.id,
);
const deleteMutation = useDeletePosition();

const position = computed(() => data.value?.data ?? null);

const isNotFound = computed<boolean>(() => {
    if (!isError.value) return false;
    const err = error.value;
    if (axios.isAxiosError(err)) return err.response?.status === 404;
    return false;
});
const isGenericError = computed<boolean>(() => isError.value && !isNotFound.value);

const canEdit = computed<boolean>(() => auth.can('hrm.position.update'));
const canDelete = computed<boolean>(() => auth.can('hrm.position.delete'));

function statusSeverity(status: PositionStatus): StatusSeverity {
    switch (status) {
        case 'active':
            return 'success';
        case 'archived':
            return 'neutral';
    }
}
function statusLabel(status: PositionStatus): string {
    return t(`hrm.position.status.${status}`);
}

const breadcrumbs = computed(() => [
    { label: t('hrm.position.breadcrumb.list'), to: { name: HRM_ROUTES.POSITION_LIST } },
    {
        label: position.value?.title ?? t('hrm.position.breadcrumb.list'),
    },
]);

function navigateToList(): void {
    void router.push({ name: HRM_ROUTES.POSITION_LIST });
}
function navigateToEdit(): void {
    if (!position.value) return;
    void router.push({
        name: HRM_ROUTES.POSITION_EDIT,
        params: { id: position.value.id },
    });
}

function onDelete(): void {
    if (!position.value) return;
    const current = position.value;
    confirmDelete({
        message: t('hrm.position.delete.confirmMessage', { title: current.title }),
        acceptLabel: t('hrm.position.delete.confirmAction'),
        onAccept: async () => {
            try {
                await deleteMutation.mutateAsync(current.id);
                toast.add({
                    severity: 'success',
                    summary: t('hrm.position.delete.toast.success'),
                    life: 3000,
                });
                void router.push({ name: HRM_ROUTES.POSITION_LIST });
            } catch {
                toast.add({
                    severity: 'error',
                    summary: t('hrm.position.delete.toast.error'),
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
                :title="t('hrm.position.breadcrumb.list')"
                :breadcrumbs="[{ label: t('hrm.position.breadcrumb.list'), to: { name: HRM_ROUTES.POSITION_LIST } }]"
            />
            <LoadingState variant="detail" data-testid="position-detail-loading" />
        </template>

        <template v-else-if="isNotFound">
            <PageHeader
                :title="t('hrm.position.notFound.title')"
                :breadcrumbs="[{ label: t('hrm.position.breadcrumb.list'), to: { name: HRM_ROUTES.POSITION_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="position-detail-not-found"
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
                        data-testid="position-detail-back-to-list"
                        @click="navigateToList"
                    />
                </div>
            </CardSection>
        </template>

        <template v-else-if="isGenericError">
            <PageHeader
                :title="t('hrm.position.breadcrumb.list')"
                :breadcrumbs="[{ label: t('hrm.position.breadcrumb.list'), to: { name: HRM_ROUTES.POSITION_LIST } }]"
            />
            <CardSection>
                <ErrorState data-testid="position-detail-error" @retry="refetch" />
            </CardSection>
        </template>

        <template v-else-if="position">
            <PageHeader :title="position.title" :breadcrumbs="breadcrumbs">
                <template #actions>
                    <Button
                        v-if="canEdit"
                        :label="t('hrm.position.detail.edit')"
                        icon="pi pi-pencil"
                        severity="secondary"
                        data-testid="position-detail-edit-button"
                        @click="navigateToEdit"
                    />
                    <Button
                        v-if="canDelete"
                        :label="t('hrm.position.detail.delete')"
                        icon="pi pi-trash"
                        severity="danger"
                        :loading="deleteMutation.isPending.value"
                        data-testid="position-detail-delete-button"
                        @click="onDelete"
                    />
                </template>
            </PageHeader>

            <CardSection :title="t('hrm.position.detail.sections.details')">
                <dl class="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.position.detail.fields.code') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary tabular-nums"
                            data-testid="position-detail-code"
                        >
                            {{ position.code }}
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.position.detail.fields.title') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="position-detail-title"
                        >
                            {{ position.title }}
                        </dd>
                    </div>

                    <div class="sm:col-span-2">
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.position.detail.fields.description') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="position-detail-description"
                        >
                            <span v-if="position.description">{{ position.description }}</span>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.position.detail.noDescription') }}
                            </span>
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.position.detail.fields.status') }}
                        </dt>
                        <dd class="mt-1" data-testid="position-detail-status">
                            <StatusBadge
                                :severity="statusSeverity(position.status)"
                                :label="statusLabel(position.status)"
                            />
                        </dd>
                    </div>
                </dl>
            </CardSection>

            <!-- Employees-with-this-position section. Count comes pre-
                 computed from the server (PositionResource.employees_count
                 populated via loadCount). "View employees" navigates to
                 the Employee list with ?position_id=N — the same URL
                 param the position chip on that page reads. Single
                 source of truth for the filtered view. -->
            <CardSection
                :title="t('hrm.position.detail.sections.employees')"
                class="mt-4"
            >
                <div class="flex items-center justify-between gap-4">
                    <p class="text-base text-text-secondary" data-testid="position-detail-employees-count">
                        {{ t('hrm.position.detail.employeesCount', position.employees_count, {
                            named: { n: position.employees_count },
                        }) }}
                    </p>
                    <RouterLink
                        v-if="position.employees_count > 0"
                        :to="{
                            name: HRM_ROUTES.EMPLOYEE_LIST,
                            query: { position_id: position.id },
                        }"
                        class="inline-flex items-center gap-1 text-brand hover:underline focus:outline-none focus:underline"
                        data-testid="position-detail-view-employees"
                    >
                        {{ t('hrm.position.detail.viewEmployees') }}
                        <i class="pi pi-arrow-right text-xs" aria-hidden="true"></i>
                    </RouterLink>
                </div>
            </CardSection>
        </template>
    </PageLayout>
</template>
