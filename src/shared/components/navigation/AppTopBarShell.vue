<script setup lang="ts">
// ─────────────────────────────────────────────────────────────────────────────
// AppTopBarShell — purely structural outer container for the top bar.
// Three slots:
//
//   #left   — logo, app-identity badge (HRM layout), app-switcher (future)
//   #center — flexible filler region; HRM may put a global search here
//             later, the launcher leaves it empty for now
//   #right  — tenant label + avatar dropdown + (future) notification bell
//
// No store reads. No props. No conditionals. The shell is just the
// flex chrome — every layout composes it with its own slot contents,
// which is the explicit Option (a) decision: distinct layout content
// via composition, not slot-driven inheritance.
//
// Height locked at 56px (h-14) to match the original AppTopBar so the
// rest of the page chrome doesn't reflow during the refactor.
// ─────────────────────────────────────────────────────────────────────────────
</script>

<template>
    <header
        class="app-topbar-shell flex h-14 items-center justify-between border-b border-border-default bg-surface px-6"
        role="banner"
    >
        <div class="flex items-center gap-4">
            <slot name="left" />
        </div>

        <div class="flex-1 px-6">
            <slot name="center" />
        </div>

        <div class="flex items-center gap-4">
            <slot name="right" />
        </div>
    </header>
</template>
