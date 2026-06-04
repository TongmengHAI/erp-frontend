<script setup lang="ts">
import axios from 'axios';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import ToggleSwitch from 'primevue/toggleswitch';
import { useToast } from 'primevue/usetoast';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import CardSection from '@/shared/components/layout/CardSection.vue';
import LoadingState from '@/shared/components/state/LoadingState.vue';
import ErrorState from '@/shared/components/state/ErrorState.vue';
import NotFoundPage from '@/shared/components/state/NotFoundPage.vue';
import FormActions from '@/shared/components/form/FormActions.vue';
import { useTenantQuery } from '@/modules/super-admin/composables/useTenants';
import {
    useSyncTenantModules,
    useTenantModulesQuery,
} from '@/modules/super-admin/composables/useTenantModules';
import { SUPER_ADMIN_ROUTES } from '@/modules/super-admin/routes';
import {
    KNOWN_MODULE_KEYS,
    type ModuleStatus,
} from '@/modules/super-admin/types/tenantModule';
import type { BreadcrumbItem } from '@/shared/types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// TenantModuleEditorPage — per-tenant entitlement editor.
//
// Renders one row per known module (KNOWN_MODULE_KEYS) with an active/
// disabled toggle. The current state comes from useTenantModulesQuery;
// the desired state lives in a local `desiredStatuses` map. Save fires
// the sync mutation with the FULL desired state (the backend's sync
// endpoint is a partial-update reconciliation — passing every module
// is safe and explicit).
//
// After save, the tenant_user on this tenant gets 403
// module_not_entitled on their next request to any newly-disabled
// module's routes. The axios interceptor + ModuleNotEntitledPage
// surface that 403 as a friendly module-disabled screen.
//
// Why a separate page (not inline on TenantDetailPage): entitlement
// changes are a deliberate action with audit implications. A separate
// page makes the action visible in the URL, the breadcrumb, and the
// session timeline — the SA can't accidentally toggle a module mid-
// view of other tenant data.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    id?: number;
}
const props = defineProps<Props>();

const { t } = useI18n();
const router = useRouter();
const toast = useToast();

const tenantId = computed<number>(() => props.id ?? 0);

// ─── Tenant + entitlement reads ─────────────────────────────────────────────
const {
    data: tenantData,
    isLoading: isTenantLoading,
    isError: isTenantError,
    error: tenantError,
} = useTenantQuery(tenantId);

const {
    data: modulesData,
    isLoading: isModulesLoading,
    isError: isModulesError,
    refetch: refetchModules,
} = useTenantModulesQuery(tenantId);

const isLoading = computed<boolean>(() => isTenantLoading.value || isModulesLoading.value);
const isError = computed<boolean>(() => isTenantError.value || isModulesError.value);

const isNotFound = computed<boolean>(() => {
    if (!isTenantError.value) return false;
    const err = tenantError.value;
    if (axios.isAxiosError(err)) return err.response?.status === 404;
    return false;
});

// ─── Desired state mirror — keyed by module_key ───────────────────────────
// Map from module_key → 'active' | 'disabled'. Initialized once when the
// query resolves; user toggles mutate it locally; save sends the snapshot.
const desiredStatuses = ref<Record<string, ModuleStatus>>({});

watch(
    () => modulesData.value?.data,
    (modules) => {
        if (!modules) return;
        const next: Record<string, ModuleStatus> = {};
        // Default every KNOWN module to 'disabled' first, then overlay
        // the backend's actual state. KEY-not-in-response means the
        // tenant simply doesn't have a row yet → treated as Disabled
        // (the backend's enforcement treats absent + disabled the same).
        for (const key of KNOWN_MODULE_KEYS) {
            next[key] = 'disabled';
        }
        for (const m of modules) {
            if (KNOWN_MODULE_KEYS.includes(m.module_key)) {
                next[m.module_key] = m.status;
            }
        }
        desiredStatuses.value = next;
    },
    { immediate: true },
);

// ─── Dirty tracking ─────────────────────────────────────────────────────────
const isDirty = computed<boolean>(() => {
    const current = modulesData.value?.data ?? [];
    for (const key of KNOWN_MODULE_KEYS) {
        const desired = desiredStatuses.value[key] ?? 'disabled';
        const fromServer =
            current.find((m) => m.module_key === key)?.status ?? 'disabled';
        if (desired !== fromServer) return true;
    }
    return false;
});

// ─── Sync ───────────────────────────────────────────────────────────────────
const syncMutation = useSyncTenantModules();
const formError = ref<string | null>(null);

async function onSave(): Promise<void> {
    formError.value = null;
    const modules = KNOWN_MODULE_KEYS.map((key) => ({
        module_key: key,
        status: desiredStatuses.value[key] ?? 'disabled',
    }));

    try {
        await syncMutation.mutateAsync({
            tenantId: tenantId.value,
            payload: { modules },
        });
        toast.add({
            severity: 'success',
            summary: t('superAdmin.tenantModules.editor.toast.saved'),
            life: 3000,
        });
    } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
            const status = e.response?.status;
            if (status === 403 || status === 404) {
                formError.value = t('superAdmin.tenantModules.editor.errors.forbidden');
                return;
            }
        }
        formError.value = t('superAdmin.tenantModules.editor.errors.unknown');
    }
}

function onCancel(): void {
    void router.push({
        name: SUPER_ADMIN_ROUTES.TENANT_DETAIL,
        params: { id: tenantId.value },
    });
}

function moduleLabel(key: string): string {
    // Backed by i18n: superAdmin.tenantModules.modules.{key}.label/.description.
    // Unknown keys (e.g. legacy rows from before a key renames) render
    // the raw key as a fallback — safer than a translation key error.
    const labelKey = `superAdmin.tenantModules.modules.${key}.label`;
    const labelValue = t(labelKey);
    return labelValue === labelKey ? key : labelValue;
}

function moduleDescription(key: string): string {
    const descKey = `superAdmin.tenantModules.modules.${key}.description`;
    const descValue = t(descKey);
    return descValue === descKey ? '' : descValue;
}

const breadcrumbs = computed<BreadcrumbItem[]>(() => [
    {
        label: t('superAdmin.tenants.breadcrumb.list'),
        to: { name: SUPER_ADMIN_ROUTES.TENANT_LIST },
    },
    {
        label: tenantData.value?.data?.name ?? '',
        to: tenantId.value > 0
            ? { name: SUPER_ADMIN_ROUTES.TENANT_DETAIL, params: { id: String(tenantId.value) } }
            : { name: SUPER_ADMIN_ROUTES.TENANT_LIST },
    },
    { label: t('superAdmin.tenantModules.editor.breadcrumb') },
]);

const pageTitle = computed<string>(() =>
    tenantData.value?.data?.name
        ? t('superAdmin.tenantModules.editor.title', {
              name: tenantData.value.data.name,
          })
        : t('superAdmin.tenantModules.editor.titleGeneric'),
);
</script>

<template>
    <PageLayout width="narrow">
        <template v-if="isLoading">
            <LoadingState variant="detail" data-testid="tenant-module-editor-loading" />
        </template>

        <template v-else-if="isNotFound">
            <NotFoundPage data-testid="tenant-module-editor-not-found" />
        </template>

        <template v-else-if="isError">
            <ErrorState
                data-testid="tenant-module-editor-error"
                @retry="() => void refetchModules()"
            />
        </template>

        <template v-else>
            <PageHeader :title="pageTitle" :breadcrumbs="breadcrumbs" />

            <CardSection :title="t('superAdmin.tenantModules.editor.sections.modules')">
                <p class="mb-4 text-sm text-text-secondary">
                    {{ t('superAdmin.tenantModules.editor.intro') }}
                </p>

                <div
                    v-if="formError"
                    role="alert"
                    data-testid="tenant-module-editor-error-banner"
                    class="mb-4 rounded-md border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-text"
                >
                    {{ formError }}
                </div>

                <ul class="flex flex-col gap-3 divide-y divide-border-default">
                    <li
                        v-for="key in KNOWN_MODULE_KEYS"
                        :key="key"
                        class="flex items-center gap-4 pt-3 first:pt-0"
                        :data-testid="`module-row-${key}`"
                    >
                        <div class="flex-1">
                            <p class="text-sm font-medium text-text-primary">
                                {{ moduleLabel(key) }}
                            </p>
                            <p
                                v-if="moduleDescription(key)"
                                class="mt-0.5 text-xs text-text-tertiary"
                            >
                                {{ moduleDescription(key) }}
                            </p>
                        </div>
                        <ToggleSwitch
                            :model-value="desiredStatuses[key] === 'active'"
                            :data-testid="`module-toggle-${key}`"
                            @update:model-value="
                                (v: boolean) => {
                                    desiredStatuses[key] = v ? 'active' : 'disabled';
                                }
                            "
                        />
                        <span
                            class="w-20 text-right text-xs font-medium"
                            :class="
                                desiredStatuses[key] === 'active'
                                    ? 'text-success'
                                    : 'text-text-tertiary'
                            "
                            :data-testid="`module-status-label-${key}`"
                        >
                            {{
                                t(
                                    `superAdmin.tenantModules.editor.statusLabel.${desiredStatuses[key] ?? 'disabled'}`,
                                )
                            }}
                        </span>
                    </li>
                </ul>

                <FormActions
                    :submit-label="t('superAdmin.tenantModules.editor.save')"
                    :loading="syncMutation.isPending.value"
                    :disabled="!isDirty"
                    @submit="onSave"
                    @cancel="onCancel"
                />
            </CardSection>
        </template>
    </PageLayout>
</template>
