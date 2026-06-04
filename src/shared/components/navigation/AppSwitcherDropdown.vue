<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Menu from 'primevue/menu';
import type { MenuItem } from 'primevue/menuitem';

import { accessibleApps as filterAccessibleApps } from '@/shared/launcher/accessibleApps';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// AppSwitcherDropdown — direct app-to-app jump from the top bar, for
// users who don't want the launcher round-trip.
//
// Visibility rule: rendered ONLY when the user has access to 2+ apps.
// In v1 (only HRM in LAUNCHER_APPS), hrm-permissioned users see ONE
// app → dropdown returns null DOM. Future Accounting ships → users
// with both perms see the dropdown surface automatically; no other
// code changes.
//
// Why hidden-by-default rather than always-shown:
//   • A dropdown with one item is UI noise, not affordance.
//   • The logo already navigates to the launcher; users with one app
//     don't need a second affordance for "go elsewhere."
//
// Why a separate component rather than inline in AppTopBarShell:
//   • Same conditional-visibility logic the LauncherPage uses, kept
//     in one component for testability. The shell stays purely
//     structural.
//
// Menu source: LAUNCHER_APPS filtered by auth.canAny(prefix) — same
// gate the launcher uses. Single source of truth for "what apps does
// this user see."
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

// Filter routed through shared accessibleApps() helper — single source
// of truth for "which apps does this user see in launcher / switcher
// surfaces?" Both LauncherPage and this component consume the same
// helper so they can't drift. Belt-and-suspenders per §10.6.
const accessibleApps = computed(() =>
    filterAccessibleApps({
        isSuperAdmin: auth.isSuperAdmin,
        entitledModules: auth.entitledModules,
        permissions: auth.permissions,
    }),
);

// Hidden when fewer than 2 apps are accessible. v1 default for
// hrm-only users; computed so future permission changes (e.g. a
// new role grant in the same session) flip it reactively.
const shouldRender = computed(() => accessibleApps.value.length >= 2);

const menu = ref<InstanceType<typeof Menu> | null>(null);

function toggleMenu(event: Event): void {
    menu.value?.toggle(event);
}

const menuItems = computed<MenuItem[]>(() =>
    accessibleApps.value.map((app) => ({
        label: t(app.label),
        icon: app.icon,
        command: () => {
            void router.push({ name: app.defaultRouteName });
        },
    })),
);
</script>

<template>
    <div v-if="shouldRender" data-testid="topbar-app-switcher">
        <button
            type="button"
            class="flex items-center gap-1.5 rounded-md p-1.5 text-text-secondary hover:bg-surface-sunken hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-haspopup="true"
            :aria-label="t('navigation.topbar.appSwitcherAriaLabel')"
            data-testid="topbar-app-switcher-trigger"
            @click="toggleMenu"
        >
            <i class="pi pi-th-large text-sm" aria-hidden="true"></i>
            <i class="pi pi-angle-down text-xs" aria-hidden="true"></i>
        </button>
        <Menu
            ref="menu"
            :model="menuItems"
            :popup="true"
            data-testid="topbar-app-switcher-menu"
        />
    </div>
</template>
