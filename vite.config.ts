import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [vue(), tailwindcss()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        port: 5173,
        proxy: {
            // Forward API + Sanctum CSRF cookie to Laravel during dev.
            '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/sanctum': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/up': { target: 'http://127.0.0.1:8000', changeOrigin: true },
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        // CSS must process in tests so the tokens playground smoke test can
        // resolve var(--app-*) and Tailwind v4 @theme variables in computed
        // styles. See src/dev/__tests__/tokens-playground.spec.ts.
        css: true,
    },
});
