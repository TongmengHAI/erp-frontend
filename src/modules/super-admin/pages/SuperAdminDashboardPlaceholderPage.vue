<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import CardSection from '@/shared/components/layout/CardSection.vue';

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder for the SA dashboard. Session 7 of the SA Portal slice
// replaces this with the real 5-tile + 2-list dashboard consuming the
// backend /api/v1/super-admin/dashboard endpoint (Session 4).
//
// Session 5 (this file) ships only the shell + the named route the
// getDefaultRoute(SA) target needs. Without this stub, an SA login
// would 404 on its post-login redirect.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
</script>

<template>
    <PageLayout>
        <PageHeader :title="t('superAdmin.dashboard.placeholder.title')" />
        <CardSection>
            <p class="text-sm text-text-secondary">
                {{ t('superAdmin.dashboard.placeholder.description') }}
            </p>
        </CardSection>
    </PageLayout>
</template>
