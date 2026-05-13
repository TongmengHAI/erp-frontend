<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
import { computed } from 'vue';

/**
 * LoadingState — skeleton screens for the three common page shapes.
 *
 * Shapes per F2a plan §6.B:
 *   - list:   N rows of 14px-tall bars with 4px row gap; default 5 rows.
 *             Variable bar widths break monotony (real text isn't uniform).
 *   - detail: 30px × 40% title bar, then 3 paragraph bars at 100%/95%/85%,
 *             then a 240px tall block (representing a card area).
 *   - card:   60% × 20px title bar, then 2 paragraph bars at 100%/80%.
 *
 * Wraps PrimeVue Skeleton, which carries the pulse animation.
 */
interface Props {
    variant?: 'list' | 'detail' | 'card';
    rows?: number;
}

const props = withDefaults(defineProps<Props>(), {
    variant: 'list',
    rows: 5,
});

// Width cycle gives the skeleton list a less patterned look than a monotonic
// descent. Values picked to read as "real text" rather than "staircase."
const LIST_WIDTH_CYCLE = ['100%', '82%', '96%', '73%', '90%'];

const listWidths = computed(() =>
    Array.from({ length: props.rows }, (_, i) => LIST_WIDTH_CYCLE[i % LIST_WIDTH_CYCLE.length]),
);
</script>

<template>
    <!-- list -->
    <div v-if="variant === 'list'" class="flex flex-col gap-1" aria-busy="true" aria-live="polite">
        <Skeleton
            v-for="(w, i) in listWidths"
            :key="i"
            height="14px"
            :width="w"
            border-radius="4px"
        />
    </div>

    <!-- detail -->
    <div
        v-else-if="variant === 'detail'"
        class="flex flex-col gap-4 rounded-md border border-border-default bg-surface p-6"
        aria-busy="true"
        aria-live="polite"
    >
        <Skeleton height="30px" width="40%" border-radius="4px" />
        <div class="flex flex-col gap-1">
            <Skeleton height="14px" width="100%" border-radius="4px" />
            <Skeleton height="14px" width="95%" border-radius="4px" />
            <Skeleton height="14px" width="85%" border-radius="4px" />
        </div>
        <Skeleton height="240px" width="100%" border-radius="6px" />
    </div>

    <!-- card -->
    <div
        v-else
        class="flex flex-col gap-3 rounded-md border border-border-default bg-surface p-6"
        aria-busy="true"
        aria-live="polite"
    >
        <Skeleton height="20px" width="60%" border-radius="4px" />
        <div class="flex flex-col gap-1">
            <Skeleton height="12px" width="100%" border-radius="4px" />
            <Skeleton height="12px" width="80%" border-radius="4px" />
        </div>
    </div>
</template>
