<script setup lang="ts">
import ConfirmDialog from 'primevue/confirmdialog';

/**
 * AppConfirmDialog — singleton ConfirmDialog instance.
 *
 * Mounted once in App.vue. Consumer code never instantiates it directly;
 * it's the destination for require() calls made via useAppConfirm().
 *
 * PrimeVue's ConfirmDialog already inherits our preset styling (border-radius,
 * shadow, button colors). No additional passthrough config needed.
 */
</script>

<template>
    <ConfirmDialog />
</template>
