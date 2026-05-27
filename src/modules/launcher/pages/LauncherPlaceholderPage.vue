<script setup lang="ts">
import { useI18n } from 'vue-i18n';

// ─────────────────────────────────────────────────────────────────────────────
// LauncherPlaceholderPage — TEMPORARY page rendered at /apps during
// Session 1. Session 2 replaces this with the real LauncherPage (grid
// of app cards driven by LAUNCHER_APPS).
//
// Exists so:
//   • Session 1's verification gate can confirm the logo navigates
//     to /apps and the LauncherLayout renders
//   • The router structure is in place so Session 2 only changes the
//     component, not the route shape
//
// The copy is intentionally bland — this isn't a "Coming soon" tile,
// it's a structural placeholder that the next session replaces.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
</script>

<template>
    <div
        class="flex min-h-[60vh] flex-col items-center justify-center px-6 py-12 text-center"
        data-testid="launcher-placeholder"
    >
        <i class="pi pi-th-large text-5xl text-text-tertiary" aria-hidden="true"></i>
        <h1 class="mt-4 text-2xl font-semibold text-text-primary">
            {{ t('launcher.placeholder.title') }}
        </h1>
        <p class="mt-2 max-w-md text-base text-text-secondary">
            {{ t('launcher.placeholder.description') }}
        </p>
    </div>
</template>
