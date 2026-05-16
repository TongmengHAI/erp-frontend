<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import CardSection from '@/shared/components/layout/CardSection.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import PageLayout from '@/shared/components/layout/PageLayout.vue';

// ─────────────────────────────────────────────────────────────────────────────
// ModuleComingSoonPage — placeholder for sidebar module routes whose real
// content hasn't shipped yet. Lives inside the AppShell so the user keeps
// nav + breadcrumb context after clicking a sidebar item.
//
// Reads the module's display name from `route.meta.moduleLabel`. Same
// route name + path + breadcrumb survives the swap to the real module
// page — when a domain ships, its slice swaps the `component` field and
// drops `moduleLabel` from the route definition; nothing else changes.
//
// This file (and the shared-stubs directory) is intentionally
// short-lived: when the last module ships, delete the directory.
// Composes the same F2a primitives (PageLayout / PageHeader / CardSection)
// as the dashboard, so the page reads as a real product surface with a
// "coming soon" message — not a different visual treatment.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const route = useRoute();

const moduleLabel = computed(
    () => (route.meta.moduleLabel as string | undefined) ?? '',
);
</script>

<template>
    <PageLayout>
        <PageHeader
            :title="moduleLabel"
            :subtitle="t('comingSoonPage.subtitle')"
        />
        <CardSection :title="t('comingSoonPage.cardTitle')">
            <p class="text-sm text-text-secondary">
                {{ t('comingSoonPage.cardDescription', { module: moduleLabel }) }}
            </p>
            <p class="mt-4 text-xs text-text-tertiary">
                {{ t('dashboard.comingSoon') }}
            </p>
        </CardSection>
    </PageLayout>
</template>
