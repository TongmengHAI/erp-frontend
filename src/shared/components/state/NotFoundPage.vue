<script setup lang="ts">
import Button from 'primevue/button';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';

/**
 * NotFoundPage — full-viewport 404 page.
 *
 * Same structural shape as PermissionDeniedPage: full-viewport, centered,
 * icon + title + description + action. Mounted as the catch-all route in F4.
 *
 * Slot `actions` overrides the default "Go to dashboard" link.
 */
const { t } = useI18n();
</script>

<template>
    <div
        class="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-sunken px-6 py-12 text-center"
    >
        <i class="pi pi-compass text-6xl text-text-tertiary" aria-hidden="true"></i>
        <h1 class="text-3xl font-semibold text-text-primary">
            {{ t('common.notFound.title') }}
        </h1>
        <p class="max-w-md text-base text-text-secondary">
            {{ t('common.notFound.description') }}
        </p>
        <div class="mt-4">
            <slot name="actions">
                <RouterLink v-slot="{ navigate }" :to="{ name: 'dashboard' }" custom>
                    <Button
                        :label="t('common.notFound.action')"
                        icon="pi pi-home"
                        @click="navigate"
                    />
                </RouterLink>
            </slot>
        </div>
    </div>
</template>
