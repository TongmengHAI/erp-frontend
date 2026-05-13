<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { type DateFormat, formatDate } from '@/shared/utils/date';

/**
 * DateDisplay — formats a Date or ISO string for display.
 *
 * Five formats (F2 master plan decision #7 revised):
 *   iso-datetime / iso-date  → machine, locale-independent
 *   short / medium / long    → human, locale-driven via useI18n()
 */
interface Props {
    date: string | Date;
    format?: DateFormat;
    locale?: string;
}

const props = withDefaults(defineProps<Props>(), {
    format: 'short',
    locale: undefined,
});

const { locale: i18nLocale } = useI18n();

const formatted = computed(() => formatDate(props.date, props.format, props.locale ?? i18nLocale.value));
</script>

<template>
    <span>{{ formatted }}</span>
</template>
