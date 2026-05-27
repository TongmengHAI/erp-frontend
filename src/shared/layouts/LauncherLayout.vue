<script setup lang="ts">
import { RouterView } from 'vue-router';

import AppTopBarShell from '@/shared/components/navigation/AppTopBarShell.vue';
import LogoLink from '@/shared/components/navigation/LogoLink.vue';
import UserMenu from '@/shared/components/navigation/UserMenu.vue';

// ─────────────────────────────────────────────────────────────────────────────
// LauncherLayout — chrome for /apps (and any future "between apps"
// surfaces).
//
// Composition: the same shared AppTopBarShell + LogoLink + UserMenu the
// HRM layout uses, deliberately minus the sidebar + AppIdentityBadge.
// "Between apps" is the explicit visual cue — no app rail, no app
// identity badge, just the launcher in the main region.
//
// The Session 2 LauncherPage lands as the `''` child of the /apps
// parent route. Session 1 ships the layout chrome wrapping a placeholder
// page so the routing structure is in place + the verification gate
// can exercise "logo navigates to launcher" end-to-end.
// ─────────────────────────────────────────────────────────────────────────────
</script>

<template>
    <div class="launcher-layout flex min-h-screen flex-col" data-testid="launcher-layout">
        <AppTopBarShell>
            <template #left>
                <LogoLink />
            </template>
            <template #right>
                <UserMenu />
            </template>
        </AppTopBarShell>
        <main class="flex-1 overflow-y-auto bg-surface-sunken">
            <RouterView />
        </main>
    </div>
</template>
