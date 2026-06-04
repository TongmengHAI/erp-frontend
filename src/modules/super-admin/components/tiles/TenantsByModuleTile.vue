<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import CardSection from '@/shared/components/layout/CardSection.vue';
import type { ModuleEntitlementCounts } from '@/modules/super-admin/types/dashboard';

// ─────────────────────────────────────────────────────────────────────────────
// Tile #3 — tenants per module breakdown per Q6. Renders one row per
// module with active + disabled counts. v1 has HRM only; future modules
// (accounting, inventory, etc.) extend the list automatically as the
// backend's tenants_by_module aggregation widens.
//
// Module key → display label via i18n lookup. Unknown keys (legacy or
// pre-rename) fall back to the raw key so the tile never blanks.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    rows: ModuleEntitlementCounts[];
}

const props = defineProps<Props>();

const { t } = useI18n();

function moduleLabel(key: string): string {
    const labelKey = `superAdmin.tenantModules.modules.${key}.label`;
    const labelValue = t(labelKey);
    return labelValue === labelKey ? key : labelValue;
}

const isEmpty = computed<boolean>(() => props.rows.length === 0);
</script>

<template>
    <CardSection data-testid="tile-tenants-by-module">
        <p class="text-xs font-medium uppercase text-text-tertiary">
            {{ t('superAdmin.dashboard.tiles.tenantsByModule') }}
        </p>

        <p
            v-if="isEmpty"
            class="mt-3 text-sm text-text-secondary"
            data-testid="tile-tenants-by-module-empty"
        >
            {{ t('superAdmin.dashboard.tiles.tenantsByModuleEmpty') }}
        </p>

        <ul v-else class="mt-3 flex flex-col gap-2" data-testid="tile-tenants-by-module-list">
            <li
                v-for="row in props.rows"
                :key="row.module_key"
                class="flex items-baseline justify-between gap-3"
                :data-testid="`tile-tenants-by-module-row-${row.module_key}`"
            >
                <span class="text-sm font-medium text-text-primary">
                    {{ moduleLabel(row.module_key) }}
                </span>
                <span class="text-sm text-text-secondary tabular-nums">
                    {{
                        t('superAdmin.dashboard.tiles.tenantsByModuleRow', {
                            active: row.active_count,
                            disabled: row.disabled_count,
                        })
                    }}
                </span>
            </li>
        </ul>
    </CardSection>
</template>
