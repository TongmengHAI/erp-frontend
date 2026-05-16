<script setup lang="ts">
import { RouterView } from 'vue-router';

import AppSidebar from '@/shared/components/navigation/AppSidebar.vue';
import AppTopBar from '@/shared/components/navigation/AppTopBar.vue';
import Breadcrumbs from '@/shared/components/navigation/Breadcrumbs.vue';

// ─────────────────────────────────────────────────────────────────────────────
// AppShellLayout — chrome for every authenticated page.
//
// Composition only. Sidebar + topbar + breadcrumb trail + a scrollable main
// region that hosts the nested <RouterView />. The shell takes no props,
// emits nothing, and reads no stores directly — children (Sidebar/TopBar)
// consume `useAuthStore` / `useTenantStore` / `useUiStore` themselves.
//
// Why min-w-0 on the right column: a flex item defaults to min-width:auto,
// which makes its content (e.g. a wide table) push the column wider instead
// of overflowing inside its own scroll container. min-w-0 fixes that — the
// sidebar stays put, the content area scrolls horizontally if it must.
//
// Mounted by the parent shell route in router/index.ts; opt-in via the
// nested-route tree, not via meta.
// ─────────────────────────────────────────────────────────────────────────────
</script>

<template>
    <div class="app-shell flex min-h-screen">
        <AppSidebar />
        <div class="flex min-w-0 flex-1 flex-col">
            <AppTopBar />
            <main class="flex-1 overflow-y-auto bg-surface-sunken">
                <Breadcrumbs class="px-8 pt-6" />
                <RouterView />
            </main>
        </div>
    </div>
</template>
