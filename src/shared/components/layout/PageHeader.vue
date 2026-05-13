<script setup lang="ts">
import { RouterLink } from 'vue-router';

import type { BreadcrumbItem } from '@/shared/types/navigation';

/**
 * PageHeader — page-level title row with optional breadcrumbs and actions.
 *
 * Title renders as <h1>; assumes one PageHeader per page (convention).
 *
 * Breadcrumbs in F2a use a simple inline renderer (manual `items` prop only).
 * Auto-from-route resolution is F2c's `Breadcrumbs` component — when it
 * lands, this template's <nav> block gets replaced with `<Breadcrumbs ... />`.
 * The prop interface stays stable; consumers don't see the refactor.
 */
interface Props {
    title: string;
    subtitle?: string;
    breadcrumbs?: BreadcrumbItem[];
}

withDefaults(defineProps<Props>(), {
    subtitle: undefined,
    breadcrumbs: undefined,
});
</script>

<template>
    <header class="mb-6">
        <nav
            v-if="breadcrumbs && breadcrumbs.length > 0"
            class="mb-2"
            aria-label="Breadcrumb"
        >
            <ol class="flex flex-wrap items-center gap-1 text-sm text-text-tertiary">
                <li
                    v-for="(item, idx) in breadcrumbs"
                    :key="idx"
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
                        v-if="idx < breadcrumbs.length - 1"
                        class="pi pi-angle-right text-xs"
                        aria-hidden="true"
                    ></i>
                </li>
            </ol>
        </nav>

        <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
                <h1 class="text-3xl font-semibold text-text-primary">{{ title }}</h1>
                <p v-if="subtitle" class="mt-1 text-base text-text-secondary">
                    {{ subtitle }}
                </p>
            </div>
            <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
                <slot name="actions" />
            </div>
        </div>
    </header>
</template>
