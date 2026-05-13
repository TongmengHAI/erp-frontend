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
 * Default action links to { name: 'dashboard' }. The named route is
 * registered by F4 in production; in dev, F2a's router adds a stub
 * `dashboard` route that redirects to /__dev/components so the link is
 * clickable from the playground without router warnings.
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
                <RouterLink v-slot="{ navigate }" :to="{ name: 'dashboard' }" custom>
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
