<script setup lang="ts">
/**
 * PageLayout — top-level page container.
 *
 * Renders as <main> for accessibility (one <main> per page convention).
 * F4's AppShell composes pages via <RouterView> and MUST NOT wrap pages in
 * its own <main> — PageLayout carries the landmark.
 *
 * Width per CLAUDE.md §7.K:
 *   - `standard` = max-w-[1440px] for list pages and dashboards (default)
 *   - `narrow`   = max-w-[960px] for form-heavy detail pages
 */
interface Props {
    width?: 'standard' | 'narrow';
}

withDefaults(defineProps<Props>(), {
    width: 'standard',
});
</script>

<template>
    <main
        class="mx-auto min-h-screen bg-surface-sunken px-8 py-10"
        :class="width === 'narrow' ? 'max-w-[960px]' : 'max-w-[1440px]'"
    >
        <slot />
    </main>
</template>
