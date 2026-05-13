import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import PrimeVue from 'primevue/config';

import App from './App.vue';
import router from './router';
import { i18n } from '@/shared/i18n';
import ErpPreset from '@/shared/styles/primevue-preset';

import 'primeicons/primeicons.css';
import './style.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);
app.use(VueQueryPlugin);
app.use(PrimeVue, {
    theme: {
        preset: ErpPreset,
    },
});

app.mount('#app');
