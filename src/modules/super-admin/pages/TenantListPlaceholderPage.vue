<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import CardSection from '@/shared/components/layout/CardSection.vue';

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder for the SA tenant list. Session 6 of the SA Portal slice
// ships the real list page consuming /api/v1/super-admin/tenants
// (backend Session 3).
//
// Exists in Session 5 so SUPER_ADMIN_NAV_ITEMS has a destination for
// its "Tenants" entry and the route name is registered.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
</script>

<template>
    <PageLayout>
        <PageHeader :title="t('superAdmin.tenants.placeholder.title')" />
        <CardSection>
            <p class="text-sm text-text-secondary">
                {{ t('superAdmin.tenants.placeholder.description') }}
            </p>
        </CardSection>
    </PageLayout>
</template>
