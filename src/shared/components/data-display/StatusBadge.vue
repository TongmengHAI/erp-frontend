<script setup lang="ts">
/**
 * StatusBadge — pill-shaped colored badge for status enums.
 *
 * Pure custom (NOT a wrapper around PV Tag) per F2 master plan decision #3:
 * PV Tag's severity API doesn't align cleanly with our 5-value semantic enum,
 * and the recipe (semantic-bg + semantic-text) was already prototyped in the
 * F1 tokens playground Section 3. This component codifies that recipe.
 */
export type StatusSeverity = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface Props {
    severity: StatusSeverity;
    label: string;
}

const props = defineProps<Props>();

const severityClasses: Record<StatusSeverity, string> = {
    success: 'bg-success-bg text-success-text',
    warning: 'bg-warning-bg text-warning-text',
    danger: 'bg-danger-bg text-danger-text',
    info: 'bg-info-bg text-info-text',
    // Neutral uses surface-sunken background + secondary text. No dedicated
    // "neutral-bg" semantic — surface-sunken is the right calm gray.
    neutral: 'bg-surface-sunken text-text-secondary',
};

const classFor = severityClasses[props.severity];
</script>

<template>
    <span
        class="inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium"
        :class="classFor"
    >
        {{ label }}
    </span>
</template>
