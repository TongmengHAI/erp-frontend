<script setup lang="ts">
import { RouterView } from 'vue-router';

import AppTopBarShell from '@/shared/components/navigation/AppTopBarShell.vue';
import LogoLink from '@/shared/components/navigation/LogoLink.vue';
import AppIdentityBadge from '@/shared/components/navigation/AppIdentityBadge.vue';
import AppSwitcherDropdown from '@/shared/components/navigation/AppSwitcherDropdown.vue';
import UserMenu from '@/shared/components/navigation/UserMenu.vue';
import Breadcrumbs from '@/shared/components/navigation/Breadcrumbs.vue';
import SuperAdminAppSidebar from '@/modules/super-admin/navigation/SuperAdminAppSidebar.vue';

// ─────────────────────────────────────────────────────────────────────────────
// SuperAdminAppLayout — chrome for every page inside the SA app (every
// /super-admin/* route). FOURTH per-app layout per §10.6 (HrmAppLayout,
// AdminAppLayout, LauncherLayout, this one).
//
// Composition (not slot-based polymorphism) — the layout explicitly
// reaches for the shared chrome primitives it needs:
//   - AppTopBarShell: outer flex container, left + right slots.
//   - LogoLink: workspace logo (navigates to /apps launcher).
//   - AppIdentityBadge: reads route.matched[0].meta.app and looks the
//     'super-admin' entry up in LAUNCHER_APPS → surfaces "SUPER ADMIN"
//     in the top bar. Same mechanism as HRM's "HRM" + admin's "ADMIN".
//   - AppSwitcherDropdown: hidden when fewer than 2 apps accessible.
//     For SA users in v1 the SA card is the ONLY accessible app
//     (entitled_modules is [] by design), so the dropdown stays
//     hidden. When an SA also has tenant_user permissions (not
//     possible in v1 by composite DB CHECK; potential future cross-
//     identity), the dropdown surfaces.
//   - UserMenu: top-right avatar with logout. Same as HRM + admin.
//   - SuperAdminAppSidebar: SA-only nav (gated on auth.isSuperAdmin).
//
// Route-level access is gated by meta.requiresSuperAdmin on the
// /super-admin parent route (see router/index.ts). Non-SA users get
// 404 via the existing NotFoundPage (Q8 — the route effectively
// doesn't exist for them). This layout is reached ONLY for SA users.
// ─────────────────────────────────────────────────────────────────────────────
</script>

<template>
    <div class="super-admin-app-layout flex min-h-screen" data-testid="super-admin-app-layout">
        <SuperAdminAppSidebar />
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
