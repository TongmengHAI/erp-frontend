<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';

import type { LauncherApp } from '@/shared/launcher/apps';

// ─────────────────────────────────────────────────────────────────────────────
// LauncherAppCard — presentational tile for one app on the launcher grid.
//
// Click navigates to the app's defaultRouteName (the app's landing page —
// for HRM, that's hrm.dashboard). The whole card is a RouterLink so
// keyboard focus + click both work the same way.
//
// Visual chrome is Notion-flat per §7.K: white surface, 1px border,
// generous padding, subtle hover (border colour shift, not a shadow).
// No animations, no gradient. Icon size 32px (text-3xl) for visual
// weight; label text-base font-semibold; description text-sm muted.
//
// Single-card-launcher reality: when only one app exists in v1, the
// grid renders one tile aligned top-left at a reasonable width
// (driven by LauncherPage's grid template; cards don't stretch).
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    app: LauncherApp;
}
const props = defineProps<Props>();

const { t } = useI18n();
</script>

<template>
    <RouterLink
        :to="{ name: props.app.defaultRouteName }"
        class="launcher-app-card group flex flex-col gap-3 rounded-lg border border-border-default bg-surface p-6 transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        :data-app-id="props.app.id"
        :data-testid="`launcher-app-card-${props.app.id}`"
    >
        <div class="flex items-center gap-3">
            <i
                :class="[props.app.icon, 'text-3xl text-brand']"
                aria-hidden="true"
            ></i>
            <h2 class="text-lg font-semibold text-text-primary">
                {{ t(props.app.label) }}
            </h2>
        </div>
        <p class="text-sm text-text-secondary">
            {{ t(props.app.description) }}
        </p>
    </RouterLink>
</template>
