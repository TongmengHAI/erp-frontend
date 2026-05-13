<script setup lang="ts">
import Avatar from 'primevue/avatar';
import { computed } from 'vue';

import { avatarColor, initialsFromName } from '@/shared/utils/colorHash';

/**
 * UserAvatar — wraps PrimeVue Avatar with deterministic initials + color.
 *
 * Photo mode (`photoUrl`) takes precedence. Initials mode hashes the email
 * (or name fallback) to one of 8 muted hues from the avatar palette so dots
 * are visually distinct per user without clashing with the brand blue.
 */
interface Props {
    name: string;
    email?: string;
    photoUrl?: string;
    size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
    email: undefined,
    photoUrl: undefined,
    size: 'md',
});

// PV Avatar accepts size: 'normal' | 'large' | 'xlarge'. Map our spec to PV's.
const pvSize = computed(() => (props.size === 'sm' ? 'normal' : props.size === 'lg' ? 'xlarge' : 'large'));

// Render size in px for the wrapper background div (matches PV Avatar's box).
const sizePx = computed(() => (props.size === 'sm' ? 24 : props.size === 'lg' ? 40 : 32));

const initials = computed(() => initialsFromName(props.name));
const hashColor = computed(() => avatarColor(props.email ?? props.name));
</script>

<template>
    <Avatar
        v-if="photoUrl"
        :image="photoUrl"
        :size="pvSize"
        shape="circle"
        :aria-label="name"
    />
    <div
        v-else
        class="inline-flex items-center justify-center rounded-full font-medium text-text-inverse"
        :style="{
            width: `${sizePx}px`,
            height: `${sizePx}px`,
            backgroundColor: hashColor,
            fontSize: size === 'sm' ? '10px' : size === 'lg' ? '16px' : '12px',
        }"
        :aria-label="name"
        role="img"
    >
        {{ initials }}
    </div>
</template>
