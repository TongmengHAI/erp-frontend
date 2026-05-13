<script setup lang="ts">
import { RouterView } from 'vue-router';

import AppConfirmDialog from '@/shared/components/form/AppConfirmDialog.vue';
</script>

<template>
    <RouterView />
    <!-- Singleton confirm dialog. useAppConfirm()'s require() targets this
         instance from anywhere in the app. Mounted at the root so it works
         on the login page, in the AppShell, and on error pages alike. -->
    <AppConfirmDialog />
</template>
