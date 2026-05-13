<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { formatMoney } from '@/shared/utils/money';

/**
 * MoneyDisplay — formats a BCMath money string for display.
 *
 * Amount stays as a string end-to-end (per CLAUDE.md §3 + §7.J — floats banned
 * in money paths). Tabular numerals so table columns align.
 */
interface Props {
    amount: string;
    currency: string;
    locale?: string;
    align?: 'left' | 'right';
}

const props = withDefaults(defineProps<Props>(), {
    locale: undefined,
    align: 'right',
});

const { locale: i18nLocale } = useI18n();

const formatted = computed(() => formatMoney(props.amount, props.currency, props.locale ?? i18nLocale.value));
</script>

<template>
    <span
        class="tabular-nums"
        :class="align === 'right' ? 'text-right' : 'text-left'"
    >
        {{ formatted }}
    </span>
</template>
