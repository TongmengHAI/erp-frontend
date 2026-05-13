<script setup lang="ts">
/**
 * CardSection — bordered card with optional title row.
 *
 * Per CLAUDE.md §7.K: 1px border, 8px radius (rounded-md), padding 24px.
 * No drop shadow — borders separate surfaces, not shadows.
 *
 * Slots:
 *   - default: card body
 *   - header:  overrides the title prop with arbitrary header content
 *
 * Set `padded=false` for table/list bodies that handle their own internal
 * padding; the outer border + radius stay.
 */
interface Props {
    title?: string;
    padded?: boolean;
}

withDefaults(defineProps<Props>(), {
    title: undefined,
    padded: true,
});
</script>

<template>
    <section class="overflow-hidden rounded-md border border-border-default bg-surface">
        <header
            v-if="$slots.header || title"
            class="border-b border-border-default px-6 py-3"
        >
            <slot name="header">
                <h2 class="text-lg font-semibold text-text-primary">{{ title }}</h2>
            </slot>
        </header>

        <div :class="padded ? 'p-6' : ''">
            <slot />
        </div>
    </section>
</template>
