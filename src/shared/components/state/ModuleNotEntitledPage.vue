<script setup lang="ts">
import Button from 'primevue/button';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, RouterLink } from 'vue-router';

// ─────────────────────────────────────────────────────────────────────────────
// ModuleNotEntitledPage — full-viewport friendly 403 page for the
// "your administrator has disabled this module" case.
//
// Routed to by the axios interceptor when ANY /api/v1/* response
// returns 403 + error_code='module_not_entitled' (per the backend's
// ModuleNotEntitledException::render handler). The module key arrives
// via ?module=hrm query param so the copy can name the specific
// module the user tried to reach.
//
// Distinct from PermissionDeniedPage because:
//   • The user DOES have permission for the module's actions — they're
//     a tenant_admin with hrm.* perms. What's missing is the TENANT-
//     level entitlement.
//   • The recovery action is HUMAN (contact your admin), not technical
//     (request a permission). The copy reflects that.
//   • The visual treatment differs from "permission denied" — this is
//     a softer "module unavailable" message, not a hard "you cannot do
//     this thing" block.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const route = useRoute();

const moduleKey = computed<string | null>(() => {
    const q = route.query.module;
    return typeof q === 'string' && q.length > 0 ? q : null;
});

const moduleLabel = computed<string | null>(() => {
    if (!moduleKey.value) return null;
    const labelKey = `superAdmin.tenantModules.modules.${moduleKey.value}.label`;
    const labelValue = t(labelKey);
    return labelValue === labelKey ? moduleKey.value : labelValue;
});
</script>

<template>
    <div
        class="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-sunken px-6 py-12 text-center"
        data-testid="module-not-entitled-page"
    >
        <i class="pi pi-ban text-6xl text-text-tertiary" aria-hidden="true"></i>
        <h1 class="text-3xl font-semibold text-text-primary">
            {{ t('common.moduleNotEntitled.title') }}
        </h1>
        <p class="max-w-lg text-base text-text-secondary">
            <template v-if="moduleLabel">
                {{
                    t('common.moduleNotEntitled.descriptionWithModule', {
                        module: moduleLabel,
                    })
                }}
            </template>
            <template v-else>
                {{ t('common.moduleNotEntitled.description') }}
            </template>
        </p>
        <p class="max-w-lg text-sm text-text-tertiary">
            {{ t('common.moduleNotEntitled.action') }}
        </p>
        <div class="mt-4">
            <RouterLink v-slot="{ navigate }" :to="{ name: 'launcher' }" custom>
                <Button
                    :label="t('common.moduleNotEntitled.cta')"
                    icon="pi pi-home"
                    @click="navigate"
                />
            </RouterLink>
        </div>
    </div>
</template>
