<script setup lang="ts">
import Button from 'primevue/button';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';

/**
 * PermissionDeniedPage — full-viewport 403 page.
 *
 * Mounted as the `/403` route in F4. In F2a, the playground demos it inside
 * a bounded preview frame so the full-viewport behavior is visible without
 * taking over the page.
 *
 * Default action links to { name: 'launcher' }. Post-nav-refactor
 * the launcher is the always-available home — a user denied access to
 * a specific resource should land on the app-picker rather than back
 * on the original app (where they'd just be denied again).
 *
 * Slot `actions` overrides the default link entirely.
 */
interface Props {
    resource?: string;
}

const props = withDefaults(defineProps<Props>(), {
    resource: undefined,
});

const { t } = useI18n();
</script>

<template>
    <div
        class="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-sunken px-6 py-12 text-center"
    >
        <i class="pi pi-lock text-6xl text-text-tertiary" aria-hidden="true"></i>
        <h1 class="text-3xl font-semibold text-text-primary">
            {{ t('common.permissionDenied.title') }}
        </h1>
        <p class="max-w-md text-base text-text-secondary">
            <template v-if="props.resource">
                {{ t('common.permissionDenied.descriptionWithResource', { resource: props.resource }) }}
            </template>
            <template v-else>
                {{ t('common.permissionDenied.description') }}
            </template>
        </p>
        <div class="mt-4">
            <slot name="actions">
                <RouterLink v-slot="{ navigate }" :to="{ name: 'launcher' }" custom>
                    <Button
                        :label="t('common.permissionDenied.action')"
                        icon="pi pi-home"
                        @click="navigate"
                    />
                </RouterLink>
            </slot>
        </div>
    </div>
</template>
