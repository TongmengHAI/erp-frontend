<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute } from 'vue-router';
import Tooltip from 'primevue/tooltip';

import { ADMIN_NAV_ITEMS } from '@/modules/admin/navigation/adminNavItems';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useUiStore } from '@/shared/stores/useUiStore';
import type { SidebarModule } from '@/shared/types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// AdminAppSidebar — left rail rendered ONLY inside the admin app (any
// /admin/* route). Mirror of HrmAppSidebar's shape; deliberately a
// separate component per §7.J's per-app-layout rule (one generic
// sidebar with conditional contents is the spaghetti we're avoiding).
//
// Permission gate: canAny('settings') — any settings.* perm unlocks
// the rail. Per-route gates inside the route's `meta.permission` still
// fire the 403 page on direct navigation when the user lacks the
// specific perm (e.g. settings.hrm.update vs .view).
//
// v1 has one entry; the loop + per-item separator logic stays in place
// for Stage 2-5 expansion (Users, Roles, Module Entitlement, Branch
// Admin) — same template, no rewrites when the list grows.
// ─────────────────────────────────────────────────────────────────────────────

const vTooltip = Tooltip;
const { t } = useI18n();
const ui = useUiStore();
const auth = useAuthStore();
const route = useRoute();

const visibleItems = computed<SidebarModule[]>(() =>
    ADMIN_NAV_ITEMS.filter((m) => {
        if (!m.permission && !m.permissionPrefix) return true;
        if (m.permission && auth.can(m.permission)) return true;
        if (m.permissionPrefix && auth.canAny(m.permissionPrefix)) return true;
        return false;
    }),
);

function isActive(routeName: string): boolean {
    if (route.name === routeName) return true;
    return route.matched.some((r) => r.name === routeName);
}
</script>

<template>
    <aside
        class="app-sidebar flex flex-col border-r border-border-default bg-surface transition-[width] duration-200"
        :class="ui.sidebarCollapsed ? 'w-15' : 'w-60'"
        :data-collapsed="ui.sidebarCollapsed"
        aria-label="Admin navigation"
        data-testid="admin-app-sidebar"
    >
        <nav class="flex-1 overflow-y-auto py-4">
            <ul class="flex flex-col gap-1 px-2">
                <li v-for="m in visibleItems" :key="m.routeName">
                    <RouterLink
                        v-tooltip:right="ui.sidebarCollapsed ? t(m.label) : null"
                        :to="{ name: m.routeName }"
                        class="sidebar-item flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary"
                        :class="[
                            isActive(m.routeName) ? 'sidebar-item--active bg-brand-bg-subtle text-brand' : '',
                            ui.sidebarCollapsed ? 'justify-center' : '',
                        ]"
                        :aria-label="t(m.label)"
                        :data-route-name="m.routeName"
                    >
                        <i :class="m.icon" class="text-base" aria-hidden="true"></i>
                        <span v-if="!ui.sidebarCollapsed" class="truncate">
                            {{ t(m.label) }}
                        </span>
                    </RouterLink>
                </li>
            </ul>
        </nav>

        <div class="border-t border-border-default p-2">
            <button
                type="button"
                class="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-surface-sunken hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                :aria-label="
                    ui.sidebarCollapsed
                        ? t('navigation.sidebar.expand')
                        : t('navigation.sidebar.collapse')
                "
                data-testid="sidebar-toggle"
                @click="ui.toggleSidebar()"
            >
                <i
                    :class="
                        ui.sidebarCollapsed
                            ? 'pi pi-angle-double-right'
                            : 'pi pi-angle-double-left'
                    "
                    aria-hidden="true"
                ></i>
            </button>
        </div>
    </aside>
</template>
