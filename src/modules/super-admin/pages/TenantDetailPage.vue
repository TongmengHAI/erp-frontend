<script setup lang="ts">
import axios from 'axios';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import CardSection from '@/shared/components/layout/CardSection.vue';
import LoadingState from '@/shared/components/state/LoadingState.vue';
import ErrorState from '@/shared/components/state/ErrorState.vue';
import NotFoundPage from '@/shared/components/state/NotFoundPage.vue';
import StatusBadge, {
    type StatusSeverity,
} from '@/shared/components/data-display/StatusBadge.vue';
import { useTenantQuery, useUpdateTenant } from '@/modules/super-admin/composables/useTenants';
import { SUPER_ADMIN_ROUTES } from '@/modules/super-admin/routes';
import type { Tenant, TenantStatus } from '@/modules/super-admin/types/tenant';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';
import type { BreadcrumbItem } from '@/shared/types/navigation';

interface Props {
    id?: number;
}
const props = defineProps<Props>();

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const { confirmAction } = useAppConfirm();

const tenantId = computed<number>(() => props.id ?? 0);
const { data, isLoading, isError, error, refetch } = useTenantQuery(tenantId);

const isNotFound = computed<boolean>(() => {
    if (!isError.value) return false;
    const err = error.value;
    if (axios.isAxiosError(err)) return err.response?.status === 404;
    return false;
});

const isGenericLoadError = computed<boolean>(() => isError.value && !isNotFound.value);

const tenant = computed<Tenant | null>(() => data.value?.data ?? null);

function statusSeverity(status: TenantStatus): StatusSeverity {
    switch (status) {
        case 'active':
            return 'success';
        case 'suspended':
            return 'danger';
        case 'archived':
            return 'neutral';
    }
}

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const trail: BreadcrumbItem[] = [
        {
            label: t('superAdmin.tenants.breadcrumb.list'),
            to: { name: SUPER_ADMIN_ROUTES.TENANT_LIST },
        },
    ];
    if (tenant.value) trail.push({ label: tenant.value.name });
    return trail;
});

// ─── Suspend / resume action ───────────────────────────────────────────────
const updateMutation = useUpdateTenant();
const isMutating = ref<boolean>(false);

function onSuspend(): void {
    if (!tenant.value) return;
    const t_ = tenant.value;
    confirmAction({
        severity: 'danger',
        message: t('superAdmin.tenants.detail.suspendConfirm.title'),
        detail: t('superAdmin.tenants.detail.suspendConfirm.detail', { name: t_.name }),
        acceptLabel: t('superAdmin.tenants.detail.suspend'),
        onAccept: async () => {
            isMutating.value = true;
            try {
                await updateMutation.mutateAsync({
                    id: t_.id,
                    payload: { status: 'suspended' },
                });
                toast.add({
                    severity: 'success',
                    summary: t('superAdmin.tenants.detail.toast.suspended', { name: t_.name }),
                    life: 3000,
                });
            } finally {
                isMutating.value = false;
            }
        },
    });
}

function onResume(): void {
    if (!tenant.value) return;
    const t_ = tenant.value;
    confirmAction({
        severity: 'info',
        message: t('superAdmin.tenants.detail.resumeConfirm.title'),
        detail: t('superAdmin.tenants.detail.resumeConfirm.detail', { name: t_.name }),
        acceptLabel: t('superAdmin.tenants.detail.resume'),
        onAccept: async () => {
            isMutating.value = true;
            try {
                await updateMutation.mutateAsync({
                    id: t_.id,
                    payload: { status: 'active' },
                });
                toast.add({
                    severity: 'success',
                    summary: t('superAdmin.tenants.detail.toast.resumed', { name: t_.name }),
                    life: 3000,
                });
            } finally {
                isMutating.value = false;
            }
        },
    });
}

function onEdit(): void {
    if (!tenant.value) return;
    void router.push({
        name: SUPER_ADMIN_ROUTES.TENANT_EDIT,
        params: { id: tenant.value.id },
    });
}
</script>

<template>
    <PageLayout>
        <template v-if="isLoading">
            <LoadingState variant="detail" data-testid="tenant-detail-loading" />
        </template>

        <template v-else-if="isNotFound">
            <NotFoundPage data-testid="tenant-detail-not-found" />
        </template>

        <template v-else-if="isGenericLoadError">
            <ErrorState data-testid="tenant-detail-load-error" @retry="() => void refetch()" />
        </template>

        <template v-else-if="tenant">
            <PageHeader :title="tenant.name" :breadcrumbs="breadcrumbs">
                <template #actions>
                    <Button
                        :label="t('common.edit')"
                        icon="pi pi-pencil"
                        severity="secondary"
                        data-testid="tenant-detail-edit"
                        @click="onEdit"
                    />
                    <Button
                        v-if="tenant.status === 'active'"
                        :label="t('superAdmin.tenants.detail.suspend')"
                        icon="pi pi-ban"
                        severity="danger"
                        :disabled="isMutating"
                        data-testid="tenant-detail-suspend"
                        @click="onSuspend"
                    />
                    <Button
                        v-else-if="tenant.status === 'suspended'"
                        :label="t('superAdmin.tenants.detail.resume')"
                        icon="pi pi-check-circle"
                        :disabled="isMutating"
                        data-testid="tenant-detail-resume"
                        @click="onResume"
                    />
                </template>
            </PageHeader>

            <CardSection :title="t('superAdmin.tenants.detail.sections.profile')">
                <dl class="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('superAdmin.tenants.detail.fields.slug') }}
                        </dt>
                        <dd class="mt-1 text-sm text-text-primary" data-testid="detail-slug">
                            {{ tenant.slug }}
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('superAdmin.tenants.detail.fields.status') }}
                        </dt>
                        <dd class="mt-1">
                            <StatusBadge
                                :label="t(`superAdmin.tenants.status.${tenant.status}`)"
                                :severity="statusSeverity(tenant.status)"
                                data-testid="detail-status-badge"
                            />
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('superAdmin.tenants.detail.fields.legalName') }}
                        </dt>
                        <dd class="mt-1 text-sm text-text-primary">
                            {{ tenant.legal_name ?? '—' }}
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('superAdmin.tenants.detail.fields.country') }}
                        </dt>
                        <dd class="mt-1 text-sm text-text-primary">
                            {{ tenant.country_code }}
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('superAdmin.tenants.detail.fields.functionalCurrency') }}
                        </dt>
                        <dd class="mt-1 text-sm text-text-primary">
                            {{ tenant.functional_currency }}
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('superAdmin.tenants.detail.fields.defaultCurrency') }}
                        </dt>
                        <dd class="mt-1 text-sm text-text-primary">
                            {{ tenant.default_currency }}
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('superAdmin.tenants.detail.fields.timezone') }}
                        </dt>
                        <dd class="mt-1 text-sm text-text-primary">
                            {{ tenant.timezone }}
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('superAdmin.tenants.detail.fields.createdAt') }}
                        </dt>
                        <dd class="mt-1 text-sm text-text-primary">
                            {{ tenant.created_at }}
                        </dd>
                    </div>
                </dl>
            </CardSection>
        </template>
    </PageLayout>
</template>
