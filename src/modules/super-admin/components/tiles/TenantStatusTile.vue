<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import CardSection from '@/shared/components/layout/CardSection.vue';
import type { TenantStatusCounts } from '@/modules/super-admin/types/dashboard';

// ─────────────────────────────────────────────────────────────────────────────
// Tile #1 — total tenants with active/suspended breakdown badge per Q6.
// Renders `total` as the large headline number; `active · suspended`
// as a small secondary line below.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    counts: TenantStatusCounts;
}

const props = defineProps<Props>();

const { t } = useI18n();
</script>

<template>
    <CardSection data-testid="tile-tenant-status-counts">
        <p class="text-xs font-medium uppercase text-text-tertiary">
            {{ t('superAdmin.dashboard.tiles.totalTenants') }}
        </p>
        <p
            class="mt-1 text-4xl font-semibold text-text-primary tabular-nums"
            data-testid="tile-total-value"
        >
            {{ props.counts.total }}
        </p>
        <p
            class="mt-3 text-sm text-text-secondary"
            data-testid="tile-status-breakdown"
        >
            <span class="inline-flex items-center gap-1.5">
                <span class="inline-block h-2 w-2 rounded-full bg-success" aria-hidden="true"></span>
                {{ t('superAdmin.dashboard.tiles.activeShort', { n: props.counts.active }) }}
            </span>
            <span class="mx-3 text-text-tertiary">·</span>
            <span class="inline-flex items-center gap-1.5">
                <span class="inline-block h-2 w-2 rounded-full bg-danger" aria-hidden="true"></span>
                {{ t('superAdmin.dashboard.tiles.suspendedShort', { n: props.counts.suspended }) }}
            </span>
        </p>
    </CardSection>
</template>
