<script setup lang="ts">
import { RouterView } from 'vue-router';

import AppTopBarShell from '@/shared/components/navigation/AppTopBarShell.vue';
import LogoLink from '@/shared/components/navigation/LogoLink.vue';
import AppIdentityBadge from '@/shared/components/navigation/AppIdentityBadge.vue';
import AppSwitcherDropdown from '@/shared/components/navigation/AppSwitcherDropdown.vue';
import UserMenu from '@/shared/components/navigation/UserMenu.vue';
import Breadcrumbs from '@/shared/components/navigation/Breadcrumbs.vue';
import AdminAppSidebar from '@/modules/admin/navigation/AdminAppSidebar.vue';

// ─────────────────────────────────────────────────────────────────────────────
// AdminAppLayout — chrome for every page inside the admin app (every
// /admin/* route). Composition mirror of HrmAppLayout; separate file
// per the per-app-layout rule.
//
// meta.app = 'admin' is set on the parent route declaration in
// router/index.ts. AppIdentityBadge reads route.matched[0].meta.app
// and looks the entry up via findLauncherApp('admin') — which returns
// the `hiddenFromLauncher: true` admin entry — so the badge surfaces
// "ADMIN" in the top bar inside /admin/* even though the app doesn't
// appear in the launcher or switcher.
//
// AppSwitcherDropdown filters via !app.hiddenFromLauncher, so an
// admin user IN the admin app will not see admin offered to switch
// TO from the dropdown — they're already there. Their HRM card would
// appear (if they have hrm.* perms) for inter-app jumping.
// ─────────────────────────────────────────────────────────────────────────────
</script>

<template>
    <div class="admin-app-layout flex min-h-screen" data-testid="admin-app-layout">
        <AdminAppSidebar />
        <div class="flex min-w-0 flex-1 flex-col">
            <AppTopBarShell>
                <template #left>
                    <LogoLink />
                    <AppIdentityBadge />
                </template>
                <template #right>
                    <AppSwitcherDropdown />
                    <UserMenu />
                </template>
            </AppTopBarShell>
            <main class="flex-1 overflow-y-auto bg-surface-sunken">
                <Breadcrumbs class="px-8 pt-6" />
                <RouterView />
            </main>
        </div>
    </div>
</template>
