<script lang="ts">
import type { VNode } from 'vue';

export interface TabDescriptor {
    name: string;
    label: string;
    icon?: string;
    render: () => VNode[] | VNode | null | undefined;
}

export interface TabRegistry {
    register: (d: TabDescriptor) => void;
    unregister: (name: string) => void;
}
</script>

<script setup lang="ts">
import PvTab from 'primevue/tab';
import TabList from 'primevue/tablist';
import TabPanel from 'primevue/tabpanel';
import TabPanels from 'primevue/tabpanels';
import PvTabs from 'primevue/tabs';
import { defineComponent, onMounted, provide, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/**
 * TabGroup — declarative tab container.
 *
 * Wraps PrimeVue v4's Tabs/TabList/Tab/TabPanels/TabPanel into a friendlier
 * 2-component API (TabGroup + Tab). Child <Tab>s register themselves via
 * provide/inject; TabGroup renders the PV structure dynamically.
 *
 * URL query sync (decision D, E in F2a plan):
 *   - `syncRoute=true` (default) keeps the active tab in `?${queryKey}=`.
 *   - `queryKey="tab"` by default. Set distinct keys for nested TabGroups
 *     on the same page (e.g. inner uses `queryKey="subtab"`).
 *
 * Priority on mount when `syncRoute=true`:
 *   1. URL query value (if it matches a registered Tab name)
 *   2. Explicit v-model value (if valid)
 *   3. First registered Tab's name
 *
 * Lazy mounting: only the active panel's content is mounted (PrimeVue's
 * `lazy` prop). Inactive panels mount on activation.
 */
interface Props {
    modelValue?: string;
    syncRoute?: boolean;
    queryKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: undefined,
    syncRoute: true,
    queryKey: 'tab',
});

const emit = defineEmits<{
    'update:modelValue': [string];
}>();

// ─── Tab registry ──────────────────────────────────────────────────────────
const tabs = ref<TabDescriptor[]>([]);

provide<TabRegistry>('tabRegistry', {
    register: (d) => {
        tabs.value.push(d);
    },
    unregister: (name) => {
        tabs.value = tabs.value.filter((t) => t.name !== name);
    },
});

// ─── Active tab state ──────────────────────────────────────────────────────
const route = useRoute();
const router = useRouter();
const activeName = ref<string | undefined>(props.modelValue);

function syncToUrl(name: string) {
    if (!props.syncRoute) return;
    if (route.query[props.queryKey] === name) return;
    router.replace({ query: { ...route.query, [props.queryKey]: name } });
}

onMounted(() => {
    // Tab children's onMounted fires before parent's, so `tabs` is populated here.
    if (props.syncRoute) {
        const queryValue = route.query[props.queryKey];
        const candidate = typeof queryValue === 'string' ? queryValue : undefined;
        if (candidate && tabs.value.some((t) => t.name === candidate)) {
            activeName.value = candidate;
            emit('update:modelValue', candidate);
            return;
        }
    }

    if (activeName.value && tabs.value.some((t) => t.name === activeName.value)) {
        // v-model value is valid; ensure URL reflects it.
        syncToUrl(activeName.value);
        return;
    }

    if (tabs.value.length > 0) {
        const first = tabs.value[0].name;
        activeName.value = first;
        emit('update:modelValue', first);
        syncToUrl(first);
    }
});

watch(
    () => props.modelValue,
    (v) => {
        if (v && v !== activeName.value && tabs.value.some((t) => t.name === v)) {
            activeName.value = v;
        }
    },
);

function handleChange(value: string | number) {
    const name = String(value);
    activeName.value = name;
    emit('update:modelValue', name);
    syncToUrl(name);
}

// PrimeVue's TabPanel slot takes its content as children, not a render-prop —
// wrap the registered render function in a tiny functional component.
const panelWrapper = (render: () => VNode[] | VNode | null | undefined) =>
    defineComponent({ name: 'TabPanelContent', setup: () => render });
</script>

<template>
    <!-- Tab children register themselves on mount but render nothing. -->
    <slot />

    <PvTabs
        v-if="activeName && tabs.length > 0"
        :value="activeName"
        lazy
        @update:value="handleChange"
    >
        <TabList>
            <PvTab v-for="t in tabs" :key="t.name" :value="t.name">
                <i v-if="t.icon" :class="t.icon" class="mr-2" aria-hidden="true"></i>
                {{ t.label }}
            </PvTab>
        </TabList>
        <TabPanels>
            <TabPanel v-for="t in tabs" :key="t.name" :value="t.name">
                <component :is="panelWrapper(t.render)" />
            </TabPanel>
        </TabPanels>
    </PvTabs>
</template>
