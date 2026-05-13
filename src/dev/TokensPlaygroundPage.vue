<script setup lang="ts">
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { ref } from 'vue';
import { RouterLink } from 'vue-router';

// ─────────────────────────────────────────────────────────────────────────────
// Tokens playground — dev-only. Renders every design token visually for review.
//
// NOT a production route. Registered conditionally in src/router/index.ts under
// `if (import.meta.env.DEV)` and tree-shaken from production builds.
//
// The `data-token-test="..."` attributes are stable hooks for the smoke test
// in __tests__/tokens-playground.spec.ts — five assertions, one per category.
// One hook (color) references a Tier 2 token directly via inline style; the
// other four exercise Tier 3 Tailwind-generated utilities. This split provides
// diagnostic triangulation when the test fires.
// ─────────────────────────────────────────────────────────────────────────────

interface Swatch {
    name: string;
    cssVar: string;
}

const primaryScale: Swatch[] = [
    { name: 'primary-50', cssVar: '--app-primary-50' },
    { name: 'primary-100', cssVar: '--app-primary-100' },
    { name: 'primary-200', cssVar: '--app-primary-200' },
    { name: 'primary-300', cssVar: '--app-primary-300' },
    { name: 'primary-400', cssVar: '--app-primary-400' },
    { name: 'primary-500', cssVar: '--app-primary-500' },
    { name: 'primary-600', cssVar: '--app-primary-600' },
    { name: 'primary-700', cssVar: '--app-primary-700' },
    { name: 'primary-800', cssVar: '--app-primary-800' },
    { name: 'primary-900', cssVar: '--app-primary-900' },
];

const neutralScale: Swatch[] = [
    { name: 'neutral-0', cssVar: '--app-neutral-0' },
    { name: 'neutral-50', cssVar: '--app-neutral-50' },
    { name: 'neutral-100', cssVar: '--app-neutral-100' },
    { name: 'neutral-200', cssVar: '--app-neutral-200' },
    { name: 'neutral-300', cssVar: '--app-neutral-300' },
    { name: 'neutral-400', cssVar: '--app-neutral-400' },
    { name: 'neutral-500', cssVar: '--app-neutral-500' },
    { name: 'neutral-600', cssVar: '--app-neutral-600' },
    { name: 'neutral-700', cssVar: '--app-neutral-700' },
    { name: 'neutral-800', cssVar: '--app-neutral-800' },
    { name: 'neutral-900', cssVar: '--app-neutral-900' },
    { name: 'neutral-1000', cssVar: '--app-neutral-1000' },
];

const semanticSurfaces: Swatch[] = [
    { name: 'surface', cssVar: '--app-surface' },
    { name: 'surface-sunken', cssVar: '--app-surface-sunken' },
    { name: 'surface-overlay', cssVar: '--app-surface-overlay' },
];

const semanticText: Swatch[] = [
    { name: 'text-primary', cssVar: '--app-text-primary' },
    { name: 'text-secondary', cssVar: '--app-text-secondary' },
    { name: 'text-tertiary', cssVar: '--app-text-tertiary' },
    { name: 'text-disabled', cssVar: '--app-text-disabled' },
];

const semanticBorders: Swatch[] = [
    { name: 'border', cssVar: '--app-border' },
    { name: 'border-strong', cssVar: '--app-border-strong' },
    { name: 'border-focus', cssVar: '--app-border-focus' },
];

const semanticBrand: Swatch[] = [
    { name: 'brand', cssVar: '--app-brand' },
    { name: 'brand-hover', cssVar: '--app-brand-hover' },
    { name: 'brand-active', cssVar: '--app-brand-active' },
    { name: 'brand-bg-subtle', cssVar: '--app-brand-bg-subtle' },
];

interface StatusTriple {
    label: string;
    main: string;
    bg: string;
    text: string;
}

const statuses: StatusTriple[] = [
    { label: 'success', main: '--app-success', bg: '--app-success-bg', text: '--app-success-text' },
    { label: 'warning', main: '--app-warning', bg: '--app-warning-bg', text: '--app-warning-text' },
    { label: 'danger', main: '--app-danger', bg: '--app-danger-bg', text: '--app-danger-text' },
    { label: 'info', main: '--app-info', bg: '--app-info-bg', text: '--app-info-text' },
];

const fontSizes = [
    { name: 'text-xs', class: 'text-xs' },
    { name: 'text-sm', class: 'text-sm' },
    { name: 'text-base', class: 'text-base' },
    { name: 'text-lg', class: 'text-lg' },
    { name: 'text-xl', class: 'text-xl' },
    { name: 'text-2xl', class: 'text-2xl' },
    { name: 'text-3xl', class: 'text-3xl' },
];

const fontWeights = [
    { name: 'regular (400)', class: 'font-normal' },
    { name: 'medium (500)', class: 'font-medium' },
    { name: 'semibold (600)', class: 'font-semibold' },
    { name: 'bold (700)', class: 'font-bold' },
];

const spacings = [
    { name: '1 (4px)', cssVar: '--app-spacing-1' },
    { name: '2 (8px)', cssVar: '--app-spacing-2' },
    { name: '3 (12px)', cssVar: '--app-spacing-3' },
    { name: '4 (16px)', cssVar: '--app-spacing-4' },
    { name: '5 (20px)', cssVar: '--app-spacing-5' },
    { name: '6 (24px)', cssVar: '--app-spacing-6' },
    { name: '8 (32px)', cssVar: '--app-spacing-8' },
    { name: '10 (40px)', cssVar: '--app-spacing-10' },
    { name: '12 (48px)', cssVar: '--app-spacing-12' },
    { name: '16 (64px)', cssVar: '--app-spacing-16' },
];

const radii = [
    { name: 'sm (4px)', class: 'rounded-sm' },
    { name: 'md (8px)', class: 'rounded-md' },
    { name: 'lg (12px)', class: 'rounded-lg' },
    { name: 'full (9999px)', class: 'rounded-full' },
];

const shadows = [
    { name: 'shadow-sm', class: 'shadow-sm' },
    { name: 'shadow-md', class: 'shadow-md' },
    { name: 'shadow-lg', class: 'shadow-lg' },
];

const transitions = [
    { name: 'fast (100ms)', cssVar: '--app-duration-fast' },
    { name: 'base (200ms)', cssVar: '--app-duration-base' },
    { name: 'slow (300ms)', cssVar: '--app-duration-slow' },
];

// ─── PrimeVue-rendered section (F1.5) ───────────────────────────────────────
// Renders the most common PV widgets in their default states so preset issues
// surface here at F1 rather than downstream in F2+ component slices.
const pvInputEmpty = ref('');
const pvInputFilled = ref('jane@acme.example');
const pvInputInvalid = ref('not-an-email');
const pvSelectValue = ref<string | null>(null);
const pvSelectFilled = ref('posted');
const pvSelectOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Posted', value: 'posted' },
    { label: 'Reversed', value: 'reversed' },
];
const pvTagSeverities = [
    { label: 'primary (default)', severity: undefined },
    { label: 'secondary', severity: 'secondary' },
    { label: 'success', severity: 'success' },
    { label: 'info', severity: 'info' },
    { label: 'warn', severity: 'warn' },
    { label: 'danger', severity: 'danger' },
] as const;
</script>

<template>
    <main class="min-h-screen bg-surface-sunken">
        <!-- Cross-playground nav banner -->
        <div
            class="border-b border-border-default bg-surface px-6 py-2 text-sm text-text-secondary"
        >
            <span class="mr-3 font-medium text-text-primary">Dev playgrounds:</span>
            <span class="mr-3 font-medium text-text-primary">Tokens</span>
            <RouterLink to="/__dev/components" class="text-brand hover:underline">
                Components
            </RouterLink>
        </div>

        <div class="px-8 py-10">
        <header class="mx-auto mb-10 max-w-[1440px]">
            <h1 class="text-3xl font-semibold text-text-primary">Design Tokens — Playground</h1>
            <p class="mt-2 text-base text-text-secondary">
                Dev-only. Visual reference for every token in
                <code class="font-medium">src/shared/styles/tokens.css</code> + the Tailwind v4
                @theme block in <code class="font-medium">theme.css</code>.
            </p>
        </header>

        <div class="mx-auto flex max-w-[1440px] flex-col gap-12">
            <!-- ─── 1. Color primitives ─────────────────────────────────── -->
            <section>
                <h2 class="mb-4 text-xl font-semibold text-text-primary">1. Color primitives</h2>

                <h3 class="mb-2 text-sm font-medium text-text-secondary">Primary scale</h3>
                <div class="mb-6 grid grid-cols-5 gap-3 md:grid-cols-10">
                    <div v-for="s in primaryScale" :key="s.name" class="flex flex-col gap-1">
                        <div
                            class="h-16 w-full rounded-md border border-border-default"
                            :style="{ backgroundColor: `var(${s.cssVar})` }"
                        ></div>
                        <div class="text-xs font-medium text-text-primary">{{ s.name }}</div>
                        <code class="text-xs text-text-tertiary">{{ s.cssVar }}</code>
                    </div>
                </div>

                <h3 class="mb-2 text-sm font-medium text-text-secondary">Neutral scale</h3>
                <div class="grid grid-cols-6 gap-3 md:grid-cols-12">
                    <div v-for="s in neutralScale" :key="s.name" class="flex flex-col gap-1">
                        <div
                            class="h-16 w-full rounded-md border border-border-default"
                            :style="{ backgroundColor: `var(${s.cssVar})` }"
                        ></div>
                        <div class="text-xs font-medium text-text-primary">{{ s.name }}</div>
                        <code class="text-xs text-text-tertiary">{{ s.cssVar }}</code>
                    </div>
                </div>
            </section>

            <!-- ─── 2. Color semantics ──────────────────────────────────── -->
            <section>
                <h2 class="mb-4 text-xl font-semibold text-text-primary">2. Color semantics</h2>
                <p class="mb-4 text-sm text-text-secondary">
                    Tier 2 component-facing tokens. Components consume these (via Tailwind
                    utilities) — never the raw primitives above.
                </p>

                <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <h3 class="mb-2 text-sm font-medium text-text-secondary">Surfaces</h3>
                        <div class="flex flex-col gap-2">
                            <div
                                v-for="s in semanticSurfaces"
                                :key="s.name"
                                class="flex items-center gap-3 rounded-md border border-border-default p-3"
                                :style="{ backgroundColor: `var(${s.cssVar})` }"
                            >
                                <div class="text-xs font-medium text-text-primary">
                                    {{ s.name }}
                                </div>
                                <code class="ml-auto text-xs text-text-tertiary">
                                    {{ s.cssVar }}
                                </code>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 class="mb-2 text-sm font-medium text-text-secondary">Text</h3>
                        <div class="flex flex-col gap-2 rounded-md border border-border-default bg-surface p-3">
                            <div
                                v-for="s in semanticText"
                                :key="s.name"
                                class="flex items-center gap-3"
                            >
                                <div
                                    class="text-sm font-medium"
                                    :style="{ color: `var(${s.cssVar})` }"
                                >
                                    {{ s.name }}
                                </div>
                                <code class="ml-auto text-xs text-text-tertiary">
                                    {{ s.cssVar }}
                                </code>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 class="mb-2 text-sm font-medium text-text-secondary">Borders</h3>
                        <div class="flex flex-col gap-2">
                            <div
                                v-for="s in semanticBorders"
                                :key="s.name"
                                class="rounded-md bg-surface p-3"
                                :style="{ border: `2px solid var(${s.cssVar})` }"
                            >
                                <div class="flex items-center gap-3">
                                    <div class="text-xs font-medium text-text-primary">
                                        {{ s.name }}
                                    </div>
                                    <code class="ml-auto text-xs text-text-tertiary">
                                        {{ s.cssVar }}
                                    </code>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 class="mb-2 text-sm font-medium text-text-secondary">Brand</h3>
                        <div class="flex flex-col gap-2">
                            <div
                                v-for="s in semanticBrand"
                                :key="s.name"
                                class="flex items-center gap-3 rounded-md border border-border-default p-3"
                                :style="{ backgroundColor: `var(${s.cssVar})` }"
                            >
                                <div
                                    class="text-xs font-medium"
                                    :style="{
                                        color:
                                            s.name === 'brand-bg-subtle'
                                                ? 'var(--app-text-primary)'
                                                : 'var(--app-text-inverse)',
                                    }"
                                >
                                    {{ s.name }}
                                </div>
                                <code
                                    class="ml-auto text-xs"
                                    :style="{
                                        color:
                                            s.name === 'brand-bg-subtle'
                                                ? 'var(--app-text-tertiary)'
                                                : 'var(--app-text-inverse)',
                                    }"
                                >
                                    {{ s.cssVar }}
                                </code>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ─── 3. Status badges ────────────────────────────────────── -->
            <section>
                <h2 class="mb-4 text-xl font-semibold text-text-primary">
                    3. Status badges (bg + text recipe)
                </h2>
                <p class="mb-4 text-sm text-text-secondary">
                    semantic-bg as background + semantic-text as foreground — the recipe
                    StatusBadge.vue will codify in F2.
                </p>
                <div class="flex flex-wrap gap-3">
                    <span
                        v-for="s in statuses"
                        :key="s.label"
                        class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                        :style="{
                            backgroundColor: `var(${s.bg})`,
                            color: `var(${s.text})`,
                        }"
                    >
                        {{ s.label }}
                    </span>
                </div>
            </section>

            <!-- ─── 4. Typography ───────────────────────────────────────── -->
            <section>
                <h2 class="mb-4 text-xl font-semibold text-text-primary">4. Typography</h2>

                <h3 class="mb-2 text-sm font-medium text-text-secondary">Sizes</h3>
                <div class="mb-6 flex flex-col gap-3 rounded-md border border-border-default bg-surface p-5">
                    <div
                        v-for="(fs, idx) in fontSizes"
                        :key="fs.name"
                        class="flex items-baseline gap-4"
                    >
                        <code class="w-24 text-xs text-text-tertiary">{{ fs.name }}</code>
                        <span
                            :class="fs.class"
                            :data-token-test="idx === 2 ? 'typography' : undefined"
                        >
                            The quick brown fox jumps over the lazy dog 1234567890
                        </span>
                    </div>
                </div>

                <h3 class="mb-2 text-sm font-medium text-text-secondary">Weights</h3>
                <div class="flex flex-col gap-3 rounded-md border border-border-default bg-surface p-5">
                    <div v-for="fw in fontWeights" :key="fw.name" class="flex items-baseline gap-4">
                        <code class="w-32 text-xs text-text-tertiary">{{ fw.name }}</code>
                        <span class="text-base" :class="fw.class">
                            The quick brown fox jumps over the lazy dog
                        </span>
                    </div>
                </div>
            </section>

            <!-- ─── 5. Spacing ──────────────────────────────────────────── -->
            <section>
                <h2 class="mb-4 text-xl font-semibold text-text-primary">5. Spacing</h2>
                <div class="rounded-md border border-border-default bg-surface p-5">
                    <div v-for="sp in spacings" :key="sp.name" class="mb-2 flex items-center gap-4">
                        <code class="w-24 text-xs text-text-tertiary">{{ sp.name }}</code>
                        <div
                            class="h-4 rounded-sm bg-brand"
                            :style="{ width: `var(${sp.cssVar})` }"
                        ></div>
                    </div>
                </div>
                <!-- Hidden hook for the smoke test: spacing-4 driven via Tailwind utility `w-4`. -->
                <div class="sr-only" data-token-test="spacing">
                    <div class="w-4 h-4"></div>
                </div>
            </section>

            <!-- ─── 6. Radii ────────────────────────────────────────────── -->
            <section>
                <h2 class="mb-4 text-xl font-semibold text-text-primary">6. Radii</h2>
                <div class="flex gap-6">
                    <div
                        v-for="(r, idx) in radii"
                        :key="r.name"
                        class="flex flex-col items-center gap-2"
                    >
                        <div
                            class="h-20 w-20 border border-border-default bg-brand-bg-subtle"
                            :class="r.class"
                            :data-token-test="idx === 1 ? 'radius' : undefined"
                        ></div>
                        <code class="text-xs text-text-tertiary">{{ r.name }}</code>
                    </div>
                </div>
            </section>

            <!-- ─── 7. Shadows ──────────────────────────────────────────── -->
            <section>
                <h2 class="mb-4 text-xl font-semibold text-text-primary">7. Shadows</h2>
                <div class="flex gap-6 bg-surface-sunken p-6">
                    <div
                        v-for="(sh, idx) in shadows"
                        :key="sh.name"
                        class="flex h-24 w-32 items-center justify-center rounded-md bg-surface"
                        :class="sh.class"
                        :data-token-test="idx === 1 ? 'shadow' : undefined"
                    >
                        <code class="text-xs text-text-tertiary">{{ sh.name }}</code>
                    </div>
                </div>
            </section>

            <!-- ─── 8. Transitions ──────────────────────────────────────── -->
            <section class="mb-12">
                <h2 class="mb-4 text-xl font-semibold text-text-primary">8. Transitions</h2>
                <p class="mb-4 text-sm text-text-secondary">
                    Hover each button to see the transition duration in action.
                </p>
                <div class="flex gap-4">
                    <button
                        v-for="tr in transitions"
                        :key="tr.name"
                        type="button"
                        class="rounded-md border border-border-default bg-surface px-4 py-2 text-sm font-medium text-text-primary"
                        :style="{
                            transitionProperty: 'background-color, color, border-color',
                            transitionDuration: `var(${tr.cssVar})`,
                            transitionTimingFunction: 'var(--app-ease-default)',
                        }"
                        @mouseover="
                            ($event.currentTarget as HTMLElement).style.backgroundColor =
                                'var(--app-brand)';
                            ($event.currentTarget as HTMLElement).style.color =
                                'var(--app-text-inverse)';
                        "
                        @mouseleave="
                            ($event.currentTarget as HTMLElement).style.backgroundColor =
                                'var(--app-surface)';
                            ($event.currentTarget as HTMLElement).style.color =
                                'var(--app-text-primary)';
                        "
                    >
                        {{ tr.name }}
                    </button>
                </div>
            </section>

            <!-- ─── 9. PrimeVue-rendered (preset verification) ──────────── -->
            <section class="mb-12">
                <h2 class="mb-2 text-xl font-semibold text-text-primary">
                    9. PrimeVue-rendered (preset verification)
                </h2>
                <p class="mb-6 text-sm text-text-secondary">
                    Most common PrimeVue widgets in their default states. The point of this
                    section is to surface preset misconfiguration at F1 — if Buttons render
                    in zinc, InputTexts have dark backgrounds, or Tags appear off-palette,
                    the issue is here, not in any downstream component slice.
                </p>

                <!-- Buttons -->
                <h3 class="mb-2 text-sm font-medium text-text-secondary">Button</h3>
                <div class="mb-6 flex flex-wrap items-center gap-3 rounded-md border border-border-default bg-surface p-4">
                    <Button label="Primary" />
                    <Button label="Secondary" severity="secondary" />
                    <Button label="Danger" severity="danger" />
                    <Button icon="pi pi-check" aria-label="Confirm" />
                    <Button label="With icon" icon="pi pi-plus" />
                    <Button label="Text" text />
                    <Button label="Disabled" disabled />
                </div>

                <!-- InputText -->
                <h3 class="mb-2 text-sm font-medium text-text-secondary">InputText</h3>
                <div class="mb-6 flex flex-wrap items-center gap-3 rounded-md border border-border-default bg-surface p-4">
                    <InputText v-model="pvInputEmpty" placeholder="Empty + placeholder" />
                    <InputText v-model="pvInputFilled" />
                    <InputText v-model="pvInputEmpty" placeholder="Disabled" disabled />
                    <InputText v-model="pvInputInvalid" invalid />
                </div>

                <!-- Select -->
                <h3 class="mb-2 text-sm font-medium text-text-secondary">Select</h3>
                <div class="mb-6 flex flex-wrap items-center gap-3 rounded-md border border-border-default bg-surface p-4">
                    <Select
                        v-model="pvSelectValue"
                        :options="pvSelectOptions"
                        option-label="label"
                        option-value="value"
                        placeholder="Closed + placeholder"
                    />
                    <Select
                        v-model="pvSelectFilled"
                        :options="pvSelectOptions"
                        option-label="label"
                        option-value="value"
                    />
                    <Select
                        v-model="pvSelectValue"
                        :options="pvSelectOptions"
                        option-label="label"
                        option-value="value"
                        placeholder="Disabled"
                        disabled
                    />
                </div>

                <!-- Tag -->
                <h3 class="mb-2 text-sm font-medium text-text-secondary">Tag</h3>
                <div class="mb-2 flex flex-wrap items-center gap-3 rounded-md border border-border-default bg-surface p-4">
                    <Tag v-for="t in pvTagSeverities" :key="t.label" :severity="t.severity" :value="t.label" />
                </div>
                <p class="mb-6 text-sm text-text-secondary">
                    Non-primary severities currently render in Aura's default palette
                    (sky / green / orange / red). This is expected — overriding semantic
                    colour primitives is a tracked preset-hardening follow-up (F1.6),
                    not part of F1.5.
                </p>

                <!-- Avatar -->
                <h3 class="mb-2 text-sm font-medium text-text-secondary">Avatar (initials mode)</h3>
                <div class="flex flex-wrap items-center gap-3 rounded-md border border-border-default bg-surface p-4">
                    <Avatar label="J" size="normal" shape="circle" />
                    <Avatar label="JB" size="normal" shape="circle" />
                    <Avatar label="JB" size="large" shape="circle" />
                    <Avatar label="JB" size="xlarge" shape="circle" />
                </div>
            </section>

            <!-- Tier 2 colour hook for the smoke test: queries var(--app-surface) directly.
                 Triangulates failures — if this passes but Tier 3 tests fail, the @theme
                 block is the suspect, not the tokens themselves. -->
            <div
                class="sr-only"
                data-token-test="color"
                :style="{ backgroundColor: 'var(--app-surface)' }"
            ></div>
        </div>
        </div>
    </main>
</template>
