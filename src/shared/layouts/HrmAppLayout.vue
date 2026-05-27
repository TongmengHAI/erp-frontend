<script setup lang="ts">
import { RouterView } from 'vue-router';

import AppTopBarShell from '@/shared/components/navigation/AppTopBarShell.vue';
import LogoLink from '@/shared/components/navigation/LogoLink.vue';
import AppIdentityBadge from '@/shared/components/navigation/AppIdentityBadge.vue';
import AppSwitcherDropdown from '@/shared/components/navigation/AppSwitcherDropdown.vue';
import UserMenu from '@/shared/components/navigation/UserMenu.vue';
import Breadcrumbs from '@/shared/components/navigation/Breadcrumbs.vue';
import HrmAppSidebar from '@/modules/hrm/navigation/HrmAppSidebar.vue';

// ─────────────────────────────────────────────────────────────────────────────
// HrmAppLayout — chrome for every page inside the HRM app (every route
// under /hrm/*). Replaces the global AppShellLayout for HRM content.
//
// Composition (no inheritance, no slot-driven base): the layout reaches
// directly for the shared primitives it needs. AppTopBarShell provides
// the outer flex container; LogoLink, AppIdentityBadge, and UserMenu
// fill its slots. HrmAppSidebar is the HRM-scoped left rail.
//
// Why min-w-0 on the right column: a flex item defaults to min-width:
// auto, which makes its content (e.g. a wide DataTable) push the column
// wider instead of overflowing inside its own scroll container. min-w-0
// fixes that — the sidebar stays put, the content area scrolls
// horizontally if it must.
//
// meta.app = 'hrm' is set on the parent route declaration in
// router/index.ts; AppIdentityBadge reads route.matched[0].meta.app to
// surface the badge. No prop / no store — the URL is the source of truth.
// ─────────────────────────────────────────────────────────────────────────────
</script>

<template>
    <div class="hrm-app-layout flex min-h-screen" data-testid="hrm-app-layout">
        <HrmAppSidebar />
        <div class="flex min-w-0 flex-1 flex-col">
            <AppTopBarShell>
                <template #left>
                    <LogoLink />
                    <AppIdentityBadge />
                </template>
                <template #right>
                    <!-- AppSwitcherDropdown hides itself when fewer
                         than 2 apps are accessible (v1 default: hrm-
                         only users see nothing here). Future Accounting
                         lands → users with both perms see the dropdown
                         surface automatically; no layout changes. -->
                    <AppSwitcherDropdown />
                    <UserMenu />
                </template>
            </AppTopBarShell>
            <main class="flex-1 overflow-y-auto bg-surface-sunken">
                <!-- Breadcrumbs render the within-app trail only. Per the
                     locked decision: no "Apps › HRM ›" prefix. The
                     Breadcrumbs component already reads route.matched +
                     skips records that lack meta.breadcrumb; the HRM
                     parent's meta.breadcrumb is intentionally absent, so
                     the trail starts at the first child with a crumb. -->
                <Breadcrumbs class="px-8 pt-6" />
                <RouterView />
            </main>
        </div>
    </div>
</template>
