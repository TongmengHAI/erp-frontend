<script setup lang="ts">
import Toast from 'primevue/toast';
import { RouterView } from 'vue-router';

import AppConfirmDialog from '@/shared/components/form/AppConfirmDialog.vue';
import { installAuthAppHooks } from '@/shared/composables/useAuthBootstrap';

// Install the auth-side-effect listeners (tenant mirror + focus refetch).
// bootstrapAuth() already ran before mount in main.ts; this hook covers
// the lifecycle concerns that need to live inside the Vue tree.
installAuthAppHooks();
</script>

<template>
    <RouterView />
    <!-- Singleton confirm dialog. useAppConfirm()'s require() targets this
         instance from anywhere in the app. Mounted at the root so it works
         on the login page, in the AppShell, and on error pages alike. -->
    <AppConfirmDialog />
    <!-- Singleton toast region. useToast()'s add() targets this instance
         from anywhere in the app. Top-right by default; positioning + life
         span configurable per-toast via the call site. -->
    <Toast position="top-right" />
</template>
