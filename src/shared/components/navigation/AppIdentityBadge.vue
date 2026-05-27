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
    <!-- Pill chrome — rounded-full + brand-bg-subtle background ties
         the active-app indicator to the same brand-tinted soft used
         by the sidebar's active item, so the visual language is
         consistent ("brand-tinted soft = you're here"). Icon and
         label both in the brand colour; uppercase tracking-wide on
         the label reads as a category identifier (not a button).
         Spacing tightened (px-2.5 py-0.5) to land at the right
         visual weight next to the bold logo. -->
    <div
        v-if="activeApp"
        class="flex items-center gap-1.5 rounded-full bg-brand-bg-subtle px-2.5 py-0.5"
        data-testid="topbar-app-identity"
        :data-app-id="activeApp.id"
    >
        <i
            :class="[activeApp.icon, 'text-xs text-brand']"
            aria-hidden="true"
        ></i>
        <span class="text-xs font-semibold uppercase tracking-wide text-brand">
            {{ t(activeApp.label) }}
        </span>
    </div>
</template>
