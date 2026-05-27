<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { findLauncherApp } from '@/shared/launcher/apps';

// ─────────────────────────────────────────────────────────────────────────────
// AppIdentityBadge — small icon + label rendered in the top bar to
// indicate "which app the user is currently in." Read from the
// route's matched meta:
//
//   route.matched[0].meta.app === 'hrm'  →  badge: pi-users + "HRM"
//   meta.app undefined (e.g. on launcher) → badge hidden
//
// The registry is the source of truth for label + icon — no per-app
// hardcoding here, no conditional in the badge component. Adding a new
// app means appending to LAUNCHER_APPS and tagging its layout route
// with meta.app — the badge picks it up automatically.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const route = useRoute();

const activeApp = computed(() => {
    const appId = route.matched[0]?.meta?.app;
    if (typeof appId !== 'string') return undefined;
    return findLauncherApp(appId);
});
</script>

<template>
    <div
        v-if="activeApp"
        class="flex items-center gap-2 rounded-md bg-surface-sunken px-3 py-1"
        data-testid="topbar-app-identity"
        :data-app-id="activeApp.id"
    >
        <i :class="[activeApp.icon, 'text-sm text-brand']" aria-hidden="true"></i>
        <span class="text-sm font-medium text-text-primary">
            {{ t(activeApp.label) }}
        </span>
    </div>
</template>
