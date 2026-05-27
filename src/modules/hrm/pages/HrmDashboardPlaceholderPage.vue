<script setup lang="ts">
import { useI18n } from 'vue-i18n';

// ─────────────────────────────────────────────────────────────────────────────
// HrmDashboardPlaceholderPage — TEMPORARY page rendered at /hrm during
// Session 1. Session 2 replaces this with the real HrmDashboardPage
// (active employees count, pending leave requests count, approver queue).
//
// Exists so:
//   • Session 1's verification gate can confirm login lands on /hrm
//     (the dashboard) rather than throwing on a missing route
//   • The hrm.dashboard named route exists for getDefaultRoute() +
//     the HrmAppSidebar's Dashboard entry to target
//
// Bland copy on purpose; the dashboard's real content lands next session.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
</script>

<template>
    <div
        class="px-8 py-6"
        data-testid="hrm-dashboard-placeholder"
    >
        <h1 class="text-2xl font-semibold text-text-primary">
            {{ t('hrm.dashboard.placeholder.title') }}
        </h1>
        <p class="mt-2 max-w-2xl text-base text-text-secondary">
            {{ t('hrm.dashboard.placeholder.description') }}
        </p>
    </div>
</template>
