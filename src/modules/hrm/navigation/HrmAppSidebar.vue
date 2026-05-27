<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute } from 'vue-router';
import Tooltip from 'primevue/tooltip';

import { HRM_NAV_ITEMS } from '@/modules/hrm/navigation/hrmNavItems';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useUiStore } from '@/shared/stores/useUiStore';
import type { SidebarModule } from '@/shared/types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// HrmAppSidebar — left-rail navigation rendered ONLY inside the HRM app
// (i.e. as a child of HrmAppLayout). Replaces the old global AppSidebar.
//
// Two visual modes driven by `useUiStore().sidebarCollapsed`:
//   - expanded (240px): icon + label
//   - collapsed (60px): icon only, label rendered as a PV tooltip
//
// Permission-gating uses canAny(prefix). For HRM items the prefix is
// 'hrm', so any hrm.* permission unlocks the full sidebar. Per-resource
// permissions (e.g. hrm.position.view) still gate the individual route
// at the route guard level — the sidebar's job is "is this app worth
// showing in the rail at all," not per-route capability.
//
// Active route highlight: bg-brand-bg-subtle + text-brand. No left
// border indicator (calmer aesthetic per §7.K). Active-match uses
// route.matched.some() so a nested route like /hrm/employees/5/edit
// still highlights the Employees item.
// ─────────────────────────────────────────────────────────────────────────────

const vTooltip = Tooltip;
const { t } = useI18n();
const ui = useUiStore();
const auth = useAuthStore();
const route = useRoute();

const visibleItems = computed<SidebarModule[]>(() =>
    HRM_NAV_ITEMS.filter((m) => {
        if (!m.permission && !m.permissionPrefix) return true;
        if (m.permission && auth.can(m.permission)) return true;
        if (m.permissionPrefix && auth.canAny(m.permissionPrefix)) return true;
        return false;
    }),
);

/**
 * A nav item is active when:
 *   • the current route name matches exactly, OR
 *   • the current route is a child of the item's route (matched chain
 *     contains the item's name) — covers detail/edit pages keeping the
 *     list item highlighted.
 */
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
        aria-label="HRM navigation"
        data-testid="hrm-app-sidebar"
    >
        <nav class="flex-1 overflow-y-auto py-4">
            <ul class="flex flex-col gap-1 px-2">
                <li
                    v-for="(m, idx) in visibleItems"
                    :key="m.routeName"
                    :class="[
                        // Subtle separator BELOW the Dashboard entry (first
                        // item in HRM_NAV_ITEMS): visually groups Dashboard
                        // as 'app home' distinct from the 7 module entries
                        // beneath. Border + small mb-1 give visual breathing
                        // room without making it look like a section header
                        // — calmer than a labeled group.
                        idx === 0 ? 'mb-1 border-b border-border-default pb-2' : '',
                    ]"
                >
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
