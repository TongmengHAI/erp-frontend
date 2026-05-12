<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apiClient } from '@/shared/api/client';

const apiHealth = ref<string>('checking…');

onMounted(async () => {
    try {
        const { data } = await apiClient.get<{ status: string; time: string }>('/health');
        apiHealth.value = `OK (${data.time})`;
    } catch {
        apiHealth.value = 'unreachable';
    }
});
</script>

<template>
    <main class="min-h-screen flex items-center justify-center p-8">
        <div class="max-w-xl text-center">
            <h1 class="text-3xl font-semibold mb-3">Enterprise ERP</h1>
            <p class="opacity-70 mb-6">
                Frontend skeleton is alive. See <code>CLAUDE.md</code> at the repo root for the full project context.
            </p>
            <p class="text-sm">
                API <code>/api/v1/health</code>: <strong>{{ apiHealth }}</strong>
            </p>
        </div>
    </main>
</template>
