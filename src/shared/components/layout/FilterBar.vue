<script setup lang="ts">
/**
 * FilterBar — horizontal container for list-page filter widgets.
 *
 * Sticky behavior: when `sticky=true`, sticks to `top: 0` of the nearest
 * scroll container. F4's AppShell wraps page content in a scrolling div, so
 * the bar will stick to the content area's top in production. If F4 reveals
 * a need to offset below a fixed top bar, a `topOffset` prop can be added
 * then — YAGNI for now.
 */
interface Props {
    sticky?: boolean;
}

withDefaults(defineProps<Props>(), {
    sticky: false,
});
</script>

<template>
    <div
        class="flex flex-wrap items-center gap-3 border-b border-border-default bg-surface-sunken px-4 py-3"
        :class="sticky ? 'sticky top-0 z-10' : ''"
    >
        <slot />
    </div>
</template>
