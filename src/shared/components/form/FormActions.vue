<script setup lang="ts">
import Button from 'primevue/button';
import { useI18n } from 'vue-i18n';

/**
 * FormActions — right-aligned submit/cancel row at the bottom of a form.
 *
 * Submit is primary (brand), cancel is secondary. `loading=true` disables both
 * and shows a spinner on submit. The `left` slot accepts ancillary actions
 * (e.g. a Delete button on an edit form); those float to the page's left edge,
 * keeping submit + cancel anchored right.
 */
interface Props {
    submitLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
    disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
    submitLabel: undefined,
    cancelLabel: undefined,
    loading: false,
    disabled: false,
});

const emit = defineEmits<{
    submit: [];
    cancel: [];
}>();

const { t } = useI18n();
</script>

<template>
    <div class="flex items-center gap-2 pt-4">
        <div v-if="$slots.left" class="mr-auto flex items-center gap-2">
            <slot name="left" />
        </div>
        <div :class="$slots.left ? '' : 'ml-auto'" class="flex items-center gap-2">
            <Button
                :label="cancelLabel ?? t('common.cancel')"
                severity="secondary"
                :disabled="loading"
                @click="emit('cancel')"
            />
            <Button
                :label="submitLabel ?? t('common.save')"
                :loading="loading"
                :disabled="disabled || loading"
                @click="emit('submit')"
            />
        </div>
    </div>
</template>
