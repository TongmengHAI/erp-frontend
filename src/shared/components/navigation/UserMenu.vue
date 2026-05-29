<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Menu from 'primevue/menu';
import type { MenuItem } from 'primevue/menuitem';

import { ADMIN_ROUTES } from '@/modules/admin/routes';
import { AUTH_ROUTES } from '@/modules/auth/routes';
import UserAvatar from '@/shared/components/data-display/UserAvatar.vue';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useTenantStore } from '@/shared/stores/useTenantStore';

// ─────────────────────────────────────────────────────────────────────────────
// UserMenu — tenant label + avatar dropdown (with Logout). Extracted from
// the old AppTopBar so both HrmAppLayout and LauncherLayout can compose it
// without duplicating the menu logic.
//
// Logout flow: store action resets local state (and on success rolls the
// server session). Route guards only run on navigation — state changes
// don't trigger them — so after $reset() we explicitly push to /login.
// Same pattern as TenantSuspendedPage. router.push is NOT inside the
// store (stores manage state, not navigation).
//
// TODO(future): Profile + Settings menu items return when their real pages
// ship. Click-that-does-nothing is a UX failure; surface items only when
// destinations exist.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const auth = useAuthStore();
const tenant = useTenantStore();
const router = useRouter();

const menu = ref<InstanceType<typeof Menu> | null>(null);

function toggleMenu(event: Event): void {
    menu.value?.toggle(event);
}

async function handleLogout(): Promise<void> {
    await auth.logout();
    await router.push({ name: AUTH_ROUTES.LOGIN });
}

function handleAdminSettings(): void {
    void router.push({ name: ADMIN_ROUTES.HRM_SETTINGS });
}

// Admin Settings menu item — gated on settings.hrm.view. The user menu
// is the DESIGNATED surface for admin access (per docs/admin.md); the
// launcher + app switcher both exclude admin via hiddenFromLauncher.
//
// Stage 2-5 admin features (Users, Roles, etc.) MAY consolidate to a
// single "Admin" item that lands users on /admin (whichever sidebar
// item they have access to first). v1 ships with one item directly
// because there's only one destination — adding an extra hop ("Admin"
// → sidebar with one item → HRM Settings) is empty chrome.
const canAccessAdmin = computed<boolean>(() => auth.can('settings.hrm.view'));

const menuItems = computed<MenuItem[]>(() => {
    const items: MenuItem[] = [];

    if (canAccessAdmin.value) {
        items.push({
            label: t('navigation.topbar.menu.adminSettings'),
            icon: 'pi pi-cog',
            command: handleAdminSettings,
        });
        items.push({ separator: true });
    }

    items.push({
        label: t('navigation.topbar.menu.logout'),
        icon: 'pi pi-sign-out',
        command: handleLogout,
    });

    return items;
});

const tenantLabel = computed(
    () => tenant.current?.name ?? t('navigation.topbar.tenantPlaceholder'),
);
const userName = computed(() => auth.user?.name ?? '');
const userEmail = computed(() => auth.user?.email ?? undefined);
</script>

<template>
    <div class="flex items-center gap-4">
        <span
            v-if="auth.isAuthenticated"
            class="text-sm text-text-secondary"
            data-testid="topbar-tenant"
        >
            {{ tenantLabel }}
        </span>

        <button
            v-if="auth.isAuthenticated"
            type="button"
            class="flex items-center gap-2 rounded-md p-1 hover:bg-surface-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-haspopup="true"
            aria-label="User menu"
            data-testid="topbar-user-menu-trigger"
            @click="toggleMenu"
        >
            <UserAvatar
                :name="userName"
                :email="userEmail"
                size="sm"
            />
        </button>
        <Menu
            ref="menu"
            :model="menuItems"
            :popup="true"
            data-testid="topbar-user-menu"
        />
    </div>
</template>
