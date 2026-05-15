<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute, type RouteLocationNormalizedLoaded } from 'vue-router';

import type { BreadcrumbItem } from '@/shared/types/navigation';

/**
 * Breadcrumbs — auto-derives from `route.matched[*].meta.breadcrumb` when
 * `items` is omitted. Each matched record with a `breadcrumb` meta entry
 * contributes one crumb; records without it are skipped (typical for root
 * layout records).
 *
 * `meta.breadcrumb` may be:
 *   - a string literal
 *   - a function (route) => string  (for dynamic crumbs like record names)
 *
 * The final crumb is rendered as plain text (current page); earlier crumbs
 * render as <RouterLink> using the matched record's path.
 *
 * Renders nothing when the resolved trail has fewer than 2 items.
 */
interface Props {
    items?: BreadcrumbItem[];
}

const props = withDefaults(defineProps<Props>(), {
    items: undefined,
});

const route = useRoute();

function deriveFromRoute(currentRoute: RouteLocationNormalizedLoaded): BreadcrumbItem[] {
    const trail: BreadcrumbItem[] = [];
    for (const match of currentRoute.matched) {
        const raw = match.meta?.breadcrumb as
            | string
            | ((r: RouteLocationNormalizedLoaded) => string)
            | undefined;
        if (raw === undefined) continue;
        const label = typeof raw === 'function' ? raw(currentRoute) : raw;
        trail.push({ label, to: { path: match.path } });
    }
    // The last derived crumb is the current page — strip its `to` so the
    // renderer marks it as final (plain text, not a link).
    if (trail.length > 0) {
        trail[trail.length - 1] = { label: trail[trail.length - 1].label };
    }
    return trail;
}

const resolvedItems = computed<BreadcrumbItem[]>(() =>
    props.items ?? deriveFromRoute(route),
);
</script>

<template>
    <nav
        v-if="resolvedItems.length > 1"
        class="breadcrumbs"
        aria-label="Breadcrumb"
    >
        <ol class="flex flex-wrap items-center gap-1 text-sm text-text-tertiary">
            <li
                v-for="(item, idx) in resolvedItems"
                :key="`${idx}-${item.label}`"
                class="flex items-center gap-1"
            >
                <RouterLink
                    v-if="item.to"
                    :to="item.to"
                    class="hover:text-text-primary"
                >
                    {{ item.label }}
                </RouterLink>
                <span v-else class="text-text-secondary">{{ item.label }}</span>
                <i
                    v-if="idx < resolvedItems.length - 1"
                    class="pi pi-angle-right text-xs"
                    aria-hidden="true"
                ></i>
            </li>
        </ol>
    </nav>
</template>
