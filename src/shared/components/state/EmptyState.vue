<script setup lang="ts">
/**
 * EmptyState — centred message + icon for "no data yet" states.
 *
 * Per CLAUDE.md §7.K, every list page MUST handle the empty case with a
 * friendly affordance, not blank space. The `actions` slot is the place for
 * a primary CTA like "Create your first entry".
 */
interface Props {
    icon?: string;
    title: string;
    description?: string;
}

withDefaults(defineProps<Props>(), {
    icon: 'pi pi-inbox',
    description: undefined,
});
</script>

<template>
    <div class="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <i :class="icon" class="text-5xl text-text-tertiary" aria-hidden="true"></i>
        <h3 class="text-xl font-medium text-text-primary">{{ title }}</h3>
        <p v-if="description" class="max-w-md text-base text-text-secondary">
            {{ description }}
        </p>
        <div v-if="$slots.actions" class="mt-2">
            <slot name="actions" />
        </div>
    </div>
</template>
