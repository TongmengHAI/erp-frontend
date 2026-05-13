import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';

// ─────────────────────────────────────────────────────────────────────────────
// PrimeVue theme preset — Tier 3 bridge for PrimeVue components.
//
// Strategy:
//   1. Add `appPrimary` (brand blue) and `appNeutral` (cool gray) to the
//      primitive layer. Values point at our Tier 2 / Tier 1 CSS variables, so
//      the runtime cascade resolves them — keeping a single source of truth.
//   2. Override `semantic.primary` to reference `{appPrimary.N}`, replacing
//      Aura's emerald default.
//   3. Override `semantic.colorScheme.light.surface` to reference
//      `{appNeutral.N}` so all "surface" references throughout Aura's deep
//      semantic tree pull from our neutrals.
//   4. Override `primitive.borderRadius.md` to 8px (Aura defaults to 6px;
//      our cards land on 8px per CLAUDE.md §7.K).
//   5. Dark colorScheme is intentionally NOT defined — PrimeVue light mode is
//      unconditional. Pairs with `darkModeSelector` being dropped from main.ts.
// ─────────────────────────────────────────────────────────────────────────────

const ErpPreset = definePreset(Aura, {
    primitive: {
        borderRadius: {
            md: '8px',
        },
        appPrimary: {
            50: 'var(--app-primary-50)',
            100: 'var(--app-primary-100)',
            200: 'var(--app-primary-200)',
            300: 'var(--app-primary-300)',
            400: 'var(--app-primary-400)',
            500: 'var(--app-primary-500)',
            600: 'var(--app-primary-600)',
            700: 'var(--app-primary-700)',
            800: 'var(--app-primary-800)',
            900: 'var(--app-primary-900)',
            // Aura references a `.950` step; map deepest tone to our 900.
            950: 'var(--app-primary-900)',
        },
        appNeutral: {
            0: 'var(--app-neutral-0)',
            50: 'var(--app-neutral-50)',
            100: 'var(--app-neutral-100)',
            200: 'var(--app-neutral-200)',
            300: 'var(--app-neutral-300)',
            400: 'var(--app-neutral-400)',
            500: 'var(--app-neutral-500)',
            600: 'var(--app-neutral-600)',
            700: 'var(--app-neutral-700)',
            800: 'var(--app-neutral-800)',
            900: 'var(--app-neutral-900)',
            // Aura references `.950`; map to our deepest neutral (-1000).
            950: 'var(--app-neutral-1000)',
        },
    },
    semantic: {
        primary: {
            50: '{appPrimary.50}',
            100: '{appPrimary.100}',
            200: '{appPrimary.200}',
            300: '{appPrimary.300}',
            400: '{appPrimary.400}',
            500: '{appPrimary.500}',
            600: '{appPrimary.600}',
            700: '{appPrimary.700}',
            800: '{appPrimary.800}',
            900: '{appPrimary.900}',
            950: '{appPrimary.950}',
        },
        colorScheme: {
            light: {
                surface: {
                    0: '{appNeutral.0}',
                    50: '{appNeutral.50}',
                    100: '{appNeutral.100}',
                    200: '{appNeutral.200}',
                    300: '{appNeutral.300}',
                    400: '{appNeutral.400}',
                    500: '{appNeutral.500}',
                    600: '{appNeutral.600}',
                    700: '{appNeutral.700}',
                    800: '{appNeutral.800}',
                    900: '{appNeutral.900}',
                    950: '{appNeutral.950}',
                },
                // Brand colours for buttons and focus rings. Bypasses Aura's
                // {primary.500} indirection and points directly at our Tier 2
                // tokens. `contrastColor` is what PrimeVue Button uses for
                // text-on-brand fills.
                primary: {
                    color: 'var(--app-brand)',
                    contrastColor: 'var(--app-brand-text-on)',
                    hoverColor: 'var(--app-brand-hover)',
                    activeColor: 'var(--app-brand-active)',
                },
                // Form field colours (InputText, InputNumber, Select, Textarea,
                // Calendar, etc). Aura's defaults point at {surface.0..700} which
                // SHOULD flow through our surface override, but binding directly
                // removes any indirection and makes the contract explicit.
                formField: {
                    background: 'var(--app-surface)',
                    disabledBackground: 'var(--app-surface-sunken)',
                    filledBackground: 'var(--app-surface-sunken)',
                    filledHoverBackground: 'var(--app-surface-sunken)',
                    filledFocusBackground: 'var(--app-surface)',
                    borderColor: 'var(--app-border)',
                    hoverBorderColor: 'var(--app-border-strong)',
                    focusBorderColor: 'var(--app-border-focus)',
                    color: 'var(--app-text-primary)',
                    disabledColor: 'var(--app-text-disabled)',
                    placeholderColor: 'var(--app-text-tertiary)',
                    iconColor: 'var(--app-text-tertiary)',
                    // invalidBorderColor / invalidPlaceholderColor left at Aura's
                    // {red.N} defaults — surfaced as out-of-scope; fix in a later
                    // pass when we wire form-validation visuals.
                },
                // Generic text colours used in Tag, Chip, Menu, etc. when they
                // reference {text.color}.
                text: {
                    color: 'var(--app-text-primary)',
                    hoverColor: 'var(--app-text-primary)',
                    mutedColor: 'var(--app-text-secondary)',
                    hoverMutedColor: 'var(--app-text-primary)',
                },
            },
        },
    },
    // Per-component severity overrides (F1.6). Aura's Tag preset references
    // {green.100} / {sky.100} / {orange.100} / {red.100} directly from the
    // primitive layer, and Button danger/success/warn/info reference
    // {green.500} / {red.500} etc. Rather than overriding those primitive
    // scales globally (risk of side effects on Message, Toast, etc.), we
    // override the component severity blocks surgically. Hover/active shades
    // use color-mix() since our Tier 2 status palette is flat — same pattern
    // Aura uses for its own dark-mode color mixing.
    components: {
        tag: {
            colorScheme: {
                light: {
                    success: {
                        background: 'var(--app-success-bg)',
                        color: 'var(--app-success-text)',
                    },
                    info: {
                        background: 'var(--app-info-bg)',
                        color: 'var(--app-info-text)',
                    },
                    warn: {
                        background: 'var(--app-warning-bg)',
                        color: 'var(--app-warning-text)',
                    },
                    danger: {
                        background: 'var(--app-danger-bg)',
                        color: 'var(--app-danger-text)',
                    },
                },
            },
        },
        button: {
            colorScheme: {
                light: {
                    root: {
                        success: {
                            background: 'var(--app-success)',
                            hoverBackground:
                                'color-mix(in srgb, var(--app-success), black 8%)',
                            activeBackground:
                                'color-mix(in srgb, var(--app-success), black 16%)',
                            borderColor: 'var(--app-success)',
                            hoverBorderColor:
                                'color-mix(in srgb, var(--app-success), black 8%)',
                            activeBorderColor:
                                'color-mix(in srgb, var(--app-success), black 16%)',
                            color: 'var(--app-brand-text-on)',
                            hoverColor: 'var(--app-brand-text-on)',
                            activeColor: 'var(--app-brand-text-on)',
                            focusRing: { color: 'var(--app-success)', shadow: 'none' },
                        },
                        info: {
                            background: 'var(--app-info)',
                            hoverBackground: 'color-mix(in srgb, var(--app-info), black 8%)',
                            activeBackground:
                                'color-mix(in srgb, var(--app-info), black 16%)',
                            borderColor: 'var(--app-info)',
                            hoverBorderColor:
                                'color-mix(in srgb, var(--app-info), black 8%)',
                            activeBorderColor:
                                'color-mix(in srgb, var(--app-info), black 16%)',
                            color: 'var(--app-brand-text-on)',
                            hoverColor: 'var(--app-brand-text-on)',
                            activeColor: 'var(--app-brand-text-on)',
                            focusRing: { color: 'var(--app-info)', shadow: 'none' },
                        },
                        warn: {
                            background: 'var(--app-warning)',
                            hoverBackground:
                                'color-mix(in srgb, var(--app-warning), black 8%)',
                            activeBackground:
                                'color-mix(in srgb, var(--app-warning), black 16%)',
                            borderColor: 'var(--app-warning)',
                            hoverBorderColor:
                                'color-mix(in srgb, var(--app-warning), black 8%)',
                            activeBorderColor:
                                'color-mix(in srgb, var(--app-warning), black 16%)',
                            color: 'var(--app-brand-text-on)',
                            hoverColor: 'var(--app-brand-text-on)',
                            activeColor: 'var(--app-brand-text-on)',
                            focusRing: { color: 'var(--app-warning)', shadow: 'none' },
                        },
                        danger: {
                            background: 'var(--app-danger)',
                            hoverBackground:
                                'color-mix(in srgb, var(--app-danger), black 8%)',
                            activeBackground:
                                'color-mix(in srgb, var(--app-danger), black 16%)',
                            borderColor: 'var(--app-danger)',
                            hoverBorderColor:
                                'color-mix(in srgb, var(--app-danger), black 8%)',
                            activeBorderColor:
                                'color-mix(in srgb, var(--app-danger), black 16%)',
                            color: 'var(--app-brand-text-on)',
                            hoverColor: 'var(--app-brand-text-on)',
                            activeColor: 'var(--app-brand-text-on)',
                            focusRing: { color: 'var(--app-danger)', shadow: 'none' },
                        },
                    },
                },
            },
        },
    },
});

export default ErpPreset;
