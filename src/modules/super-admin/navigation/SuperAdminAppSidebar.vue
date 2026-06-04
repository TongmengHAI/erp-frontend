<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute } from 'vue-router';
import Tooltip from 'primevue/tooltip';

import { SUPER_ADMIN_NAV_ITEMS } from '@/modules/super-admin/navigation/superAdminNavItems';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useUiStore } from '@/shared/stores/useUiStore';
import type { SidebarModule } from '@/shared/types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// SuperAdminAppSidebar — left rail rendered ONLY inside the SA app
// (any /super-admin/* route). Mirror of AdminAppSidebar's shape;
// per §10.6 each app's sidebar is its own component.
//
// Visibility gate: auth.isSuperAdmin. The route guard at the SA
// layout level (meta.requiresSuperAdmin: true → 404 for non-SA) is
// the primary gate; this sidebar-level gate is defense-in-depth so
// the rail never renders for a non-SA user even if the route guard
// is temporarily bypassed (e.g. mid-development with guards stripped).
// ─────────────────────────────────────────────────────────────────────────────

const vTooltip = Tooltip;
const { t } = useI18n();
const ui = useUiStore();
const auth = useAuthStore();
const route = useRoute();

const visibleItems = computed<SidebarModule[]>(() =>
    auth.isSuperAdmin ? [...SUPER_ADMIN_NAV_ITEMS] : [],
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
        aria-label="Super Admin navigation"
        data-testid="super-admin-app-sidebar"
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
