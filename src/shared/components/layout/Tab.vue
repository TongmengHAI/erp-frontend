<script lang="ts">
import { defineComponent, inject, onBeforeUnmount, onMounted } from 'vue';

import type { TabRegistry } from './TabGroup.vue';

/**
 * Tab — declarative panel inside a TabGroup.
 *
 * Renders nothing in place (the render function returns `null`). On mount,
 * registers its metadata and default slot (as a render function) with the
 * parent TabGroup, which arranges the PrimeVue Tabs/TabList/TabPanels DOM.
 *
 * Usage:
 *   <TabGroup v-model="active">
 *     <Tab name="overview" label="Overview">Overview content...</Tab>
 *     <Tab name="audit" label="Audit Log">Audit content...</Tab>
 *   </TabGroup>
 *
 * Uses `<script>` + render function (not `<script setup>`) because Vue SFCs
 * require a non-empty template block for `<script setup>`, and this
 * component intentionally renders nothing.
 */
export default defineComponent({
    name: 'AppTab',
    props: {
        name: { type: String, required: true },
        label: { type: String, required: true },
        icon: { type: String, default: undefined },
    },
    setup(props, { slots }) {
        const registry = inject<TabRegistry | null>('tabRegistry', null);
        if (!registry) {
            throw new Error('<Tab> must be a direct child of <TabGroup>.');
        }

        onMounted(() => {
            registry.register({
                name: props.name,
                label: props.label,
                icon: props.icon,
                render: () => slots.default?.() ?? null,
            });
        });

        onBeforeUnmount(() => {
            registry.unregister(props.name);
        });

        return () => null;
    },
});
</script>
