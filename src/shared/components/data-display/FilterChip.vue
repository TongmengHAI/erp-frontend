<script setup lang="ts">
// ─────────────────────────────────────────────────────────────────────────────
// FilterChip — small rounded-pill component that displays an active URL
// filter with an [×] clear affordance. The shape was inlined twice (once
// in EmployeeListPage for department_id, soon to be needed for
// position_id) before being extracted; this is the canonical home.
//
// Intentionally presentational — no router knowledge, no i18n calls. The
// parent page resolves the label string (via t() with whatever
// interpolation it needs) and passes it in; the parent owns the URL-state
// mutation that the @clear event triggers. Pairs naturally with the
// useUrlNumericFilter composable, but the chip works for any clearable
// filter (string, boolean, multi-select reduced to a count, etc.).
//
// Visual chrome matches the previous inline implementation byte-for-byte
// so the refactor is a no-op for the user. Icon defaults to pi-filter;
// data-testid is forwarded via the wrapper for callers that scope tests
// to a specific filter (e.g. "employee-list-department-filter-chip").
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    /** The rendered chip label. Parent is responsible for i18n + interpolation. */
    label: string;
    /** Accessible name for the clear button (screen reader announces). */
    clearAriaLabel: string;
    /**
     * PrimeIcons class for the leading icon. Defaults to `pi pi-filter`.
     * Provided so future chips (e.g. status indicator) can swap without
     * a component fork.
     */
    icon?: string;
}

const props = withDefaults(defineProps<Props>(), {
    icon: 'pi pi-filter',
});

const emit = defineEmits<{
    /**
     * User clicked the [×] button. Parent should clear the URL filter
     * (typically via router.replace — see useUrlNumericFilter for the
     * canonical implementation).
     */
    clear: [];
}>();

function onClear(): void {
    emit('clear');
}

// Silence unused-prop warning in template-only consumption of `icon`.
void props;
</script>

<template>
    <div class="flex items-center gap-2">
        <span
            class="inline-flex items-center gap-2 rounded-full border border-brand bg-brand-bg-subtle px-3 py-1 text-sm text-text-primary"
        >
            <i :class="['text-xs text-brand', icon]" aria-hidden="true"></i>
            <span>{{ label }}</span>
            <button
                type="button"
                class="ml-1 rounded-full p-0.5 text-text-secondary hover:bg-surface hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                :aria-label="clearAriaLabel"
                data-testid="filter-chip-clear"
                @click="onClear"
            >
                <i class="pi pi-times text-xs" aria-hidden="true"></i>
            </button>
        </span>
    </div>
</template>
