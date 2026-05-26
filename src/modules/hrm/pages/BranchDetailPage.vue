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
    useBranchQuery,
    useDeleteBranch,
} from '@/modules/hrm/composables/useBranches';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type { BranchStatus } from '@/modules/hrm/types/branch';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';

// ─────────────────────────────────────────────────────────────────────────────
// BranchDetailPage — direct transposition of PositionDetailPage, with
// the four extra Branch location fields surfaced (address, city,
// country_code, phone). Same "Employees at this branch" section.
//
// "View employees" RouterLink navigates to /hrm/employees with
// `query: { branch_id: branch.id }` — same shape as the Department/
// Position equivalents. RouterLink with `query: { ... }` REPLACES the
// entire query object, so any prior ?department_id= / ?position_id=
// is dropped on navigation. Once the user is on the Employee list page,
// the three chips render independently when their URL params are present
// (AND filters), with per-chip clear() removing only its own param.
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

const { data, isLoading, isError, error, refetch } = useBranchQuery(
    () => props.id,
);
const deleteMutation = useDeleteBranch();

const branch = computed(() => data.value?.data ?? null);

const isNotFound = computed<boolean>(() => {
    if (!isError.value) return false;
    const err = error.value;
    if (axios.isAxiosError(err)) return err.response?.status === 404;
    return false;
});
const isGenericError = computed<boolean>(() => isError.value && !isNotFound.value);

const canEdit = computed<boolean>(() => auth.can('hrm.branch.update'));
const canDelete = computed<boolean>(() => auth.can('hrm.branch.delete'));

function statusSeverity(status: BranchStatus): StatusSeverity {
    switch (status) {
        case 'active':
            return 'success';
        case 'archived':
            return 'neutral';
    }
}
function statusLabel(status: BranchStatus): string {
    return t(`hrm.branch.status.${status}`);
}

const breadcrumbs = computed(() => [
    { label: t('hrm.branch.breadcrumb.list'), to: { name: HRM_ROUTES.BRANCH_LIST } },
    {
        label: branch.value?.name ?? t('hrm.branch.breadcrumb.list'),
    },
]);

function navigateToList(): void {
    void router.push({ name: HRM_ROUTES.BRANCH_LIST });
}
function navigateToEdit(): void {
    if (!branch.value) return;
    void router.push({
        name: HRM_ROUTES.BRANCH_EDIT,
        params: { id: branch.value.id },
    });
}

function onDelete(): void {
    if (!branch.value) return;
    const current = branch.value;
    confirmDelete({
        message: t('hrm.branch.delete.confirmMessage', { name: current.name }),
        acceptLabel: t('hrm.branch.delete.confirmAction'),
        onAccept: async () => {
            try {
                await deleteMutation.mutateAsync(current.id);
                toast.add({
                    severity: 'success',
                    summary: t('hrm.branch.delete.toast.success'),
                    life: 3000,
                });
                void router.push({ name: HRM_ROUTES.BRANCH_LIST });
            } catch {
                toast.add({
                    severity: 'error',
                    summary: t('hrm.branch.delete.toast.error'),
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
                :title="t('hrm.branch.breadcrumb.list')"
                :breadcrumbs="[{ label: t('hrm.branch.breadcrumb.list'), to: { name: HRM_ROUTES.BRANCH_LIST } }]"
            />
            <LoadingState variant="detail" data-testid="branch-detail-loading" />
        </template>

        <template v-else-if="isNotFound">
            <PageHeader
                :title="t('hrm.branch.notFound.title')"
                :breadcrumbs="[{ label: t('hrm.branch.breadcrumb.list'), to: { name: HRM_ROUTES.BRANCH_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="branch-detail-not-found"
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
                        data-testid="branch-detail-back-to-list"
                        @click="navigateToList"
                    />
                </div>
            </CardSection>
        </template>

        <template v-else-if="isGenericError">
            <PageHeader
                :title="t('hrm.branch.breadcrumb.list')"
                :breadcrumbs="[{ label: t('hrm.branch.breadcrumb.list'), to: { name: HRM_ROUTES.BRANCH_LIST } }]"
            />
            <CardSection>
                <ErrorState data-testid="branch-detail-error" @retry="refetch" />
            </CardSection>
        </template>

        <template v-else-if="branch">
            <PageHeader :title="branch.name" :breadcrumbs="breadcrumbs">
                <template #actions>
                    <Button
                        v-if="canEdit"
                        :label="t('hrm.branch.detail.edit')"
                        icon="pi pi-pencil"
                        severity="secondary"
                        data-testid="branch-detail-edit-button"
                        @click="navigateToEdit"
                    />
                    <Button
                        v-if="canDelete"
                        :label="t('hrm.branch.detail.delete')"
                        icon="pi pi-trash"
                        severity="danger"
                        :loading="deleteMutation.isPending.value"
                        data-testid="branch-detail-delete-button"
                        @click="onDelete"
                    />
                </template>
            </PageHeader>

            <CardSection :title="t('hrm.branch.detail.sections.details')">
                <dl class="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.branch.detail.fields.code') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary tabular-nums"
                            data-testid="branch-detail-code"
                        >
                            {{ branch.code }}
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.branch.detail.fields.name') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="branch-detail-name"
                        >
                            {{ branch.name }}
                        </dd>
                    </div>

                    <div class="sm:col-span-2">
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.branch.detail.fields.description') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="branch-detail-description"
                        >
                            <span v-if="branch.description">{{ branch.description }}</span>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.branch.detail.noValue') }}
                            </span>
                        </dd>
                    </div>

                    <div class="sm:col-span-2">
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.branch.detail.fields.address') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="branch-detail-address"
                        >
                            <span v-if="branch.address">{{ branch.address }}</span>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.branch.detail.noValue') }}
                            </span>
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.branch.detail.fields.city') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="branch-detail-city"
                        >
                            <span v-if="branch.city">{{ branch.city }}</span>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.branch.detail.noValue') }}
                            </span>
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.branch.detail.fields.countryCode') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary tabular-nums"
                            data-testid="branch-detail-country-code"
                        >
                            <span v-if="branch.country_code">{{ branch.country_code }}</span>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.branch.detail.noValue') }}
                            </span>
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.branch.detail.fields.phone') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="branch-detail-phone"
                        >
                            <a
                                v-if="branch.phone"
                                :href="`tel:${branch.phone}`"
                                class="text-brand hover:underline"
                            >{{ branch.phone }}</a>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.branch.detail.noValue') }}
                            </span>
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.branch.detail.fields.status') }}
                        </dt>
                        <dd class="mt-1" data-testid="branch-detail-status">
                            <StatusBadge
                                :severity="statusSeverity(branch.status)"
                                :label="statusLabel(branch.status)"
                            />
                        </dd>
                    </div>
                </dl>
            </CardSection>

            <!-- Employees-at-this-branch section. Count comes pre-
                 computed from the server (BranchResource.employees_count
                 via withCount('employees')). "View employees" navigates
                 to the Employee list with ?branch_id=N — the same URL
                 param the branch chip on that page reads. Single source
                 of truth for the filtered view. -->
            <CardSection
                :title="t('hrm.branch.detail.sections.employees')"
                class="mt-4"
            >
                <div class="flex items-center justify-between gap-4">
                    <p class="text-base text-text-secondary" data-testid="branch-detail-employees-count">
                        {{ t('hrm.branch.detail.employeesCount', branch.employees_count, {
                            named: { n: branch.employees_count },
                        }) }}
                    </p>
                    <RouterLink
                        v-if="branch.employees_count > 0"
                        :to="{
                            name: HRM_ROUTES.EMPLOYEE_LIST,
                            query: { branch_id: branch.id },
                        }"
                        class="inline-flex items-center gap-1 text-brand hover:underline focus:outline-none focus:underline"
                        data-testid="branch-detail-view-employees"
                    >
                        {{ t('hrm.branch.detail.viewEmployees') }}
                        <i class="pi pi-arrow-right text-xs" aria-hidden="true"></i>
                    </RouterLink>
                </div>
            </CardSection>
        </template>
    </PageLayout>
</template>
