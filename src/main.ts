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

    // ORDER MATTERS — bootstrap BEFORE app.use(router).
    //
    // Vue Router 4's install() (invoked by app.use(router)) starts the
    // initial navigation synchronously: `router.push(history.location)`.
    // That navigation's beforeEach guards queue as microtasks. If we then
    // `await bootstrapAuth()`, the guard microtask races against fetchMe's
    // network response — whichever resolves first wins. On any timing
    // jitter (network, GC, lazy chunk loads), the guard fires with empty
    // auth state and redirects to /login. Bootstrap completes shortly
    // after but the redirect already committed.
    //
    // Installing Pinia first (so useAuthStore works), then awaiting
    // bootstrap, then installing the router, makes the race impossible:
    // initial navigation can only start once router is installed, and by
    // that time bootstrap has already populated state. The guard sees
    // accurate state on its very first evaluation.
    //
    // The defensive `await bootstrapAuth()` in guards.ts:installGuards is
    // the second half of this invariant — see comment there.
    app.use(pinia);
    await bootstrapAuth();
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

    app.mount('#app');
}

void start();
