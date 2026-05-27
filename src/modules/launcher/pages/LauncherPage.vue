<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import LauncherAppCard from '@/modules/launcher/components/LauncherAppCard.vue';
import { LAUNCHER_APPS, type LauncherApp } from '@/shared/launcher/apps';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// LauncherPage — grid of accessible apps. Replaces the Session-1
// LauncherPlaceholderPage at /apps.
//
// Filtering: walks LAUNCHER_APPS, keeps entries where the user has
// any permission under that app's permissionPrefix (auth.canAny()
// semantics — same gate the HRM sidebar uses). Single source of
// truth for "which apps does this user see" — the launcher card
// list and the HRM sidebar gate land on the same answer.
//
// v1 reality: registry has one entry (HRM), so most authenticated
// users see one card. A user with no hrm.* permissions sees zero
// cards and the empty state ("talk to your admin"). That's the
// intentional shape per the locked decision: a launcher with one
// deliberate card looks intentional, "Coming soon" placeholders
// don't.
//
// No animations on the grid, no card lifts, no stagger — per the
// explicit cuts.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const auth = useAuthStore();

const accessibleApps = computed<LauncherApp[]>(() =>
    LAUNCHER_APPS.filter((app) => auth.canAny(app.permissionPrefix)),
);
</script>

<template>
    <div class="launcher-page mx-auto max-w-6xl px-6 py-10" data-testid="launcher-page">
        <header class="mb-8">
            <h1 class="text-3xl font-semibold text-text-primary">
                {{ t('launcher.title') }}
            </h1>
            <p class="mt-2 text-base text-text-secondary">
                {{ t('launcher.subtitle') }}
            </p>
        </header>

        <!-- Empty state: zero accessible apps. The user is authenticated
             but has no app permissions; landed here either via
             getDefaultRoute's fallback or by typing /apps. The copy
             surfaces "talk to your admin" rather than a generic empty
             message — the action is human, not technical. -->
        <div
            v-if="accessibleApps.length === 0"
            class="rounded-lg border border-border-default bg-surface p-8 text-center"
            data-testid="launcher-empty-state"
        >
            <i class="pi pi-lock text-5xl text-text-tertiary" aria-hidden="true"></i>
            <h2 class="mt-4 text-xl font-semibold text-text-primary">
                {{ t('launcher.empty.title') }}
            </h2>
            <p class="mt-2 max-w-md mx-auto text-base text-text-secondary">
                {{ t('launcher.empty.description') }}
            </p>
        </div>

        <!-- Grid: minmax(280px, 320px) per column, fills naturally.
             Single-card scenario renders one tile top-left (no awkward
             stretch). Multi-card future fills rows; auto-fit wraps. -->
        <ul
            v-else
            class="grid gap-4"
            style="grid-template-columns: repeat(auto-fit, minmax(280px, 320px));"
            data-testid="launcher-app-grid"
        >
            <li v-for="app in accessibleApps" :key="app.id">
                <LauncherAppCard :app="app" />
            </li>
        </ul>
    </div>
</template>
