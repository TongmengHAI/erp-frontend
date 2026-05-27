<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';

// ─────────────────────────────────────────────────────────────────────────────
// LogoLink — clickable brand element in the top bar. ALWAYS navigates to
// the launcher (named route `launcher`), per the locked decision: "logo
// always navigates to launcher."
//
// Used by both HrmAppLayout and LauncherLayout via AppTopBarShell's #left
// slot. Centralising the navigation target here means the "where does the
// logo go?" decision lives in one place; future change is one file.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
</script>

<template>
    <RouterLink
        :to="{ name: 'launcher' }"
        class="flex items-center text-lg font-bold text-text-primary hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded"
        :aria-label="t('navigation.topbar.logoAriaLabel')"
        data-testid="topbar-logo"
    >
        <span>{{ t('navigation.topbar.logo') }}</span>
    </RouterLink>
</template>
