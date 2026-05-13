import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import tokensCss from '@/shared/styles/tokens.css?raw';
import themeCss from '@/shared/styles/theme.css?raw';

// ─────────────────────────────────────────────────────────────────────────────
// tokens-playground.spec.ts — design token smoke test.
//
// Goal: catch token-name regressions (typos, deletions) in tokens.css and the
// Tailwind v4 @theme block in theme.css.
//
// Why not a real DOM render with Tailwind utilities?
//   Vitest/jsdom doesn't run the @tailwindcss/vite plugin's utility-class
//   generation pass during tests, so classes like `text-base` / `w-4` /
//   `rounded-md` have no backing CSS rules in jsdom and any
//   getComputedStyle(element) returns empty for them. The Tailwind pipeline
//   is build-time and was never expected to execute under jsdom.
//
// Why not hardcode the expected CSS in this file?
//   That would make the test a copy of the rules — a token-name regression in
//   tokens.css would not break the test. Hardcoded == self-defeating.
//
// The approach this file uses instead:
//   1. Import tokens.css and theme.css as raw text via Vite's ?raw query, so
//      we're reading the EXACT CSS that ships to production.
//   2. Parse the @theme { ... } block out of theme.css and rewrite it to a
//      plain :root { ... } declaration. (jsdom and any standard CSS parser
//      ignore Tailwind v4's @theme directive — without this rewrite the
//      --color-*/--text-*/--radius-*/--shadow-* tokens never reach :root in
//      the test environment.)
//   3. Inject the combined CSS into a single <style> tag in document.head.
//   4. Read each token's value off :root via
//      getComputedStyle(document.documentElement).getPropertyValue(name).
//      A non-empty value proves the variable is defined; an empty value
//      means the variable wasn't declared (typo or deletion).
//
// Assertion distribution — diagnostic triangulation:
//   color       → --app-surface       (Tier 2, tokens.css)
//   spacing     → --app-spacing-4     (Tier 1, tokens.css)
//   typography  → --text-base         (Tier 3, theme.css @theme block)
//   radius      → --radius-md         (Tier 3, theme.css @theme block)
//   shadow      → --shadow-md         (Tier 3, theme.css @theme block)
//
//   If Tier 1/2 pass but Tier 3 fails → @theme block in theme.css is broken.
//   If Tier 1/2 fail   → tokens.css is broken.
//   If everything fails → the inject/rewrite setup itself is broken.
//
// Limitation: this test catches token-NAME regressions but NOT RHS chain
// breaks (e.g. `--color-surface: var(--app-surfaec)` typo). jsdom's var()
// resolution through injected <style> is unreliable enough that asserting on
// fully-resolved computed values would create false negatives. Catching the
// stronger class of regressions is left to manual visual review of the
// playground and the prod-build smoke check.
// ─────────────────────────────────────────────────────────────────────────────

let injectedStyle: HTMLStyleElement;

beforeAll(() => {
    // Rewrite theme.css's `@theme { ... }` outer block to `:root { ... }`.
    // theme.css contains a single top-level @theme block with no nested braces,
    // so a greedy end-anchored regex is sufficient and deterministic.
    const themeBlockMatch = /@theme\s*\{([\s\S]*)\n\}\s*$/.exec(themeCss.trim());
    if (!themeBlockMatch) {
        throw new Error(
            'tokens-playground.spec.ts setup: failed to parse @theme block from theme.css. ' +
                'Did the file structure change? See block comment at top of this file.',
        );
    }
    const rewrittenTheme = `:root {\n${themeBlockMatch[1]}\n}`;

    injectedStyle = document.createElement('style');
    injectedStyle.setAttribute('data-test-injection', 'tokens-playground');
    injectedStyle.textContent = `${tokensCss}\n${rewrittenTheme}`;
    document.head.appendChild(injectedStyle);
});

afterAll(() => {
    injectedStyle.remove();
});

function tokenValue(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

describe('design tokens resolve at :root', () => {
    it('color: Tier 2 --app-surface is defined in tokens.css', () => {
        expect(tokenValue('--app-surface')).not.toBe('');
    });

    it('spacing: Tier 1 --app-spacing-4 is defined in tokens.css', () => {
        expect(tokenValue('--app-spacing-4')).not.toBe('');
    });

    it('typography: Tier 3 --text-base is emitted from the @theme block', () => {
        expect(tokenValue('--text-base')).not.toBe('');
    });

    it('radius: Tier 3 --radius-md is emitted from the @theme block', () => {
        expect(tokenValue('--radius-md')).not.toBe('');
    });

    it('shadow: Tier 3 --shadow-md is emitted from the @theme block', () => {
        expect(tokenValue('--shadow-md')).not.toBe('');
    });
});
