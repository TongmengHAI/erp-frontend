<script setup lang="ts">
import Button from 'primevue/button';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/shared/stores/useAuthStore';
import { AUTH_ROUTES } from '@/modules/auth/routes';

// ─────────────────────────────────────────────────────────────────────────────
// TenantSuspendedPage — minimal screen for users whose current tenant is
// suspended or archived (backend returns 401 with error_code='tenant_inactive'
// from /auth/me).
//
// The user is technically authenticated (session cookie valid) but cannot
// access any tenant-scoped endpoint. The only meaningful action is to log
// out, which routes back to /login. /auth/logout is intentionally outside
// the tenant-required group on the backend, so this works.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const auth = useAuthStore();
const router = useRouter();

async function handleLogout(): Promise<void> {
    await auth.logout();
    await router.push({ name: AUTH_ROUTES.LOGIN });
}
</script>

<template>
    <main
        class="tenant-suspended flex min-h-screen items-center justify-center bg-surface-sunken px-4"
    >
        <div class="w-full max-w-md rounded-lg border border-border-default bg-surface p-8 text-center shadow-sm">
            <i
                class="pi pi-exclamation-triangle text-5xl text-warning"
                aria-hidden="true"
            ></i>
            <h1 class="mt-4 text-2xl font-semibold text-text-primary">
                {{ t('auth.tenantSuspended.title') }}
            </h1>
            <p class="mt-2 text-sm text-text-secondary">
                {{ t('auth.tenantSuspended.description') }}
            </p>
            <Button
                class="mt-6"
                :label="t('auth.tenantSuspended.logout')"
                icon="pi pi-sign-out"
                severity="secondary"
                data-testid="tenant-suspended-logout"
                @click="handleLogout"
            />
        </div>
    </main>
</template>
