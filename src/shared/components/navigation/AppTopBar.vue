<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Menu from 'primevue/menu';
import type { MenuItem } from 'primevue/menuitem';

import UserAvatar from '@/shared/components/data-display/UserAvatar.vue';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useTenantStore } from '@/shared/stores/useTenantStore';

/**
 * AppTopBar — persistent 56px-tall bar across the top of every authenticated
 * page.
 *
 * Layout:
 *   [Logo "MyERP"]   [<slot name="search">]   [Tenant name]  [User avatar ▼]
 *
 * Tenant is rendered as static text (master decision 12 — no switcher UX).
 * User menu opens on click of the avatar; items in F2c are stubs except
 * Logout, which calls useAuthStore().logout() (the F2c stub clears local
 * state via $reset(); F3 wires the real API call).
 */
const { t } = useI18n();
const auth = useAuthStore();
const tenant = useTenantStore();

const menu = ref<InstanceType<typeof Menu> | null>(null);

function toggleMenu(event: Event): void {
    menu.value?.toggle(event);
}

// TODO(future): restore Profile + Settings menu items when their real pages
// ship (Settings slice; user profile page). Click-that-does-nothing is a UX
// failure — surface the items only when they have working destinations.
//
//     { label: t('navigation.topbar.menu.profile'), icon: 'pi pi-user', ... },
//     { label: t('navigation.topbar.menu.settings'), icon: 'pi pi-cog', ... },
//     { separator: true },
const menuItems = computed<MenuItem[]>(() => [
    {
        label: t('navigation.topbar.menu.logout'),
        icon: 'pi pi-sign-out',
        command: () => auth.logout(),
    },
]);

const tenantLabel = computed(
    () => tenant.current?.name ?? t('navigation.topbar.tenantPlaceholder'),
);
const userName = computed(() => auth.user?.name ?? '');
const userEmail = computed(() => auth.user?.email ?? undefined);
</script>

<template>
    <header
        class="app-topbar flex h-14 items-center justify-between border-b border-border-default bg-surface px-6"
        role="banner"
    >
        <div class="flex items-center gap-6">
            <span class="text-lg font-bold text-text-primary">
                {{ t('navigation.topbar.logo') }}
            </span>
        </div>

        <div class="flex-1 px-6">
            <slot name="search" />
        </div>

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
    </header>
</template>
