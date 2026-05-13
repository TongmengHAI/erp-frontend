<script setup lang="ts">
import Button from 'primevue/button';
import { useI18n } from 'vue-i18n';

/**
 * ErrorState — recoverable failure UI for a section or list.
 *
 * Defaults use `common.error.*` and `common.retry` i18n keys. Per CLAUDE.md
 * §7.K, NEVER show raw API error messages — map errors to user-friendly text
 * in the consumer before passing here. Raw error details belong in
 * console/Sentry, not in the UI.
 *
 * Slot `actions` replaces the default Retry button when the consumer needs
 * custom recovery (e.g. "Reload page" + "Report issue" pair).
 */
interface Props {
    title?: string;
    description?: string;
}

withDefaults(defineProps<Props>(), {
    title: undefined,
    description: undefined,
});

defineEmits<{
    retry: [];
}>();

const { t } = useI18n();
</script>

<template>
    <div class="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <i
            class="pi pi-exclamation-triangle text-5xl text-danger"
            aria-hidden="true"
        ></i>
        <h3 class="text-xl font-medium text-text-primary">
            {{ title ?? t('common.error.title') }}
        </h3>
        <p class="max-w-md text-base text-text-secondary">
            {{ description ?? t('common.error.description') }}
        </p>
        <div class="mt-2">
            <slot name="actions">
                <Button
                    :label="t('common.retry')"
                    icon="pi pi-refresh"
                    severity="secondary"
                    @click="$emit('retry')"
                />
            </slot>
        </div>
    </div>
</template>
