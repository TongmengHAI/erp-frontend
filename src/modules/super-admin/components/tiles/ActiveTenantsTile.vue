<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import CardSection from '@/shared/components/layout/CardSection.vue';

// ─────────────────────────────────────────────────────────────────────────────
// Tile #2 — active tenants headline number per Q6. Same source as
// TenantStatusTile (tenant_status_counts.active) but rendered as its
// own large-number tile so the SA's eye lands on it without a
// breakdown badge to parse.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    count: number;
}

const props = defineProps<Props>();

const { t } = useI18n();
</script>

<template>
    <CardSection data-testid="tile-active-tenants">
        <p class="text-xs font-medium uppercase text-text-tertiary">
            {{ t('superAdmin.dashboard.tiles.activeTenants') }}
        </p>
        <p
            class="mt-1 text-4xl font-semibold text-text-primary tabular-nums"
            data-testid="tile-active-value"
        >
            {{ props.count }}
        </p>
        <p class="mt-3 text-sm text-text-secondary">
            {{ t('superAdmin.dashboard.tiles.activeTenantsCaption') }}
        </p>
    </CardSection>
</template>
