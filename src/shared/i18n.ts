import { createI18n } from 'vue-i18n';

import enMessages from './locales/en.json';

// ─────────────────────────────────────────────────────────────────────────────
// vue-i18n instance — Composition API mode (legacy: false).
//
// Locale strategy per CLAUDE.md §7.K:
//   - English only in F2a. Khmer (`km`) deferred until translations land.
//   - All shared-component default strings keyed under `common.*` (see locales/en.json).
//   - Locale switching UI deferred; `locale` is hardcoded to 'en' for now.
//
// Components access strings via the `useI18n()` composable in <script setup>,
// or `$t('key')` in templates.
// ─────────────────────────────────────────────────────────────────────────────

export const i18n = createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: {
        en: enMessages,
    },
});
