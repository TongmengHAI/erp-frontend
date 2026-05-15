import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';

import App from './App.vue';
import router from './router';
import { i18n } from '@/shared/i18n';
import { bootstrapAuth } from '@/shared/composables/useAuthBootstrap';
import ErpPreset from '@/shared/styles/primevue-preset';

import 'primeicons/primeicons.css';
import './style.css';

async function start(): Promise<void> {
    const app = createApp(App);
    const pinia = createPinia();

    app.use(pinia);
    app.use(router);
    app.use(i18n);
    app.use(VueQueryPlugin);
    app.use(ConfirmationService);
    app.use(PrimeVue, {
        theme: {
            preset: ErpPreset,
            options: {
                // Disable dark mode entirely (CLAUDE.md §7.K: light only). PrimeVue
                // v4's default `darkModeSelector` is 'system' — without this override
                // it activates dark scheme via prefers-color-scheme, causing
                // Aura's zinc-* dark surfaces to render in our light app.
                darkModeSelector: false,
            },
        },
    });

    // Resolve initial auth state before mounting. Avoids the flash-of-
    // unauthenticated where the home route renders briefly before the route
    // guard sees the session cookie and bounces. fetchMe internally handles
    // the 401-no-session case; non-401 failures are swallowed so a network
    // hiccup doesn't block the SPA from booting.
    await bootstrapAuth();

    app.mount('#app');
}

void start();
