<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import CardSection from '@/shared/components/layout/CardSection.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import PageLayout from '@/shared/components/layout/PageLayout.vue';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// DashboardPlaceholderPage — what lives at `/` after authentication.
//
// Real dashboard widgets / KPIs / activity feeds arrive when the business
// modules ship. Until then, this page anchors the visual chrome with three
// forward-looking placeholder cards so the first authenticated render feels
// intentional rather than empty.
//
// The greeting and card copy were locked during the F4 plan review — keep
// the operational vocabulary ("entries, postings, approvals, period status")
// aligned with the rest of the app as later content lands.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const auth = useAuthStore();

const userName = computed(() => auth.user?.name ?? '');

const placeholderCards = [
    { key: 'recentActivity' },
    { key: 'pendingApprovals' },
    { key: 'periodStatus' },
] as const;
</script>

<template>
    <PageLayout>
        <PageHeader
            :title="t('dashboard.greeting', { name: userName })"
            :subtitle="t('dashboard.subtitle')"
        />
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <CardSection
                v-for="card in placeholderCards"
                :key="card.key"
                :title="t(`dashboard.cards.${card.key}.title`)"
            >
                <p class="text-sm text-text-secondary">
                    {{ t(`dashboard.cards.${card.key}.description`) }}
                </p>
                <p class="mt-4 text-xs text-text-tertiary">
                    {{ t('dashboard.comingSoon') }}
                </p>
            </CardSection>
        </div>
    </PageLayout>
</template>
