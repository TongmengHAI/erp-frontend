/* eslint-disable vue/one-component-per-file -- this spec defines small host fixtures inline. */
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

import Tab from '@/shared/components/layout/Tab.vue';
import TabGroup from '@/shared/components/layout/TabGroup.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

// Host: declarative TabGroup with three Tabs, v-model exposed to the test.
function makeHost(opts: { initialActive?: string; syncRoute?: boolean } = {}) {
    return defineComponent({
        components: { TabGroup, Tab },
        data() {
            return { active: opts.initialActive ?? '' };
        },
        template: `
            <TabGroup v-model="active" :sync-route="${opts.syncRoute ?? true}">
                <Tab name="one" label="One"><div class="panel-one">one body</div></Tab>
                <Tab name="two" label="Two"><div class="panel-two">two body</div></Tab>
                <Tab name="three" label="Three"><div class="panel-three">three body</div></Tab>
            </TabGroup>
        `,
    });
}

describe('TabGroup', () => {
    it('mounts with the first tab active when no v-model or URL match', async () => {
        const wrapper = await mountWithGlobals(makeHost());
        await flushPromises();
        await nextTick();
        expect((wrapper.vm as unknown as { active: string }).active).toBe('one');
        expect(wrapper.find('.panel-one').exists()).toBe(true);
    });

    it('mounts with the URL query value when it matches a registered tab', async () => {
        const wrapper = await mountWithGlobals(makeHost(), {
            initialRoute: '/?tab=two',
        });
        await flushPromises();
        await nextTick();
        expect((wrapper.vm as unknown as { active: string }).active).toBe('two');
        expect(wrapper.find('.panel-two').exists()).toBe(true);
    });

    it('switching tabs emits update:modelValue and lazy-mounts the new panel', async () => {
        const wrapper = await mountWithGlobals(makeHost());
        await flushPromises();
        await nextTick();

        // Inactive panel content not in DOM yet (lazy).
        expect(wrapper.find('.panel-two').exists()).toBe(false);

        // PV Tab clickable element is the [role=tab] header inside TabList.
        const tabHeaders = wrapper.findAll('[role="tab"]');
        expect(tabHeaders.length).toBe(3);
        await tabHeaders[1].trigger('click');
        await flushPromises();
        await nextTick();

        expect((wrapper.vm as unknown as { active: string }).active).toBe('two');
        expect(wrapper.find('.panel-two').exists()).toBe(true);
    });

    it('syncRoute=false skips URL updates', async () => {
        const wrapper = await mountWithGlobals(makeHost({ syncRoute: false }), {
            initialRoute: '/',
        });
        await flushPromises();
        await nextTick();
        // First tab active despite URL having no query.
        expect((wrapper.vm as unknown as { active: string }).active).toBe('one');

        const tabHeaders = wrapper.findAll('[role="tab"]');
        await tabHeaders[2].trigger('click');
        await flushPromises();

        // Router-aware check: query stays empty when syncRoute=false.
        const router = wrapper.vm.$router;
        expect(router.currentRoute.value.query.tab).toBeUndefined();
    });

    it('rejects invalid v-model value on mount and falls through to first tab', async () => {
        const wrapper = await mountWithGlobals(makeHost({ initialActive: 'nonexistent' }));
        await flushPromises();
        await nextTick();
        // Falls through: v-model doesn't match → first tab wins.
        expect((wrapper.vm as unknown as { active: string }).active).toBe('one');
    });
});

it('throws when Tab is used outside TabGroup', async () => {
    // Stand-alone Tab without a parent registry should throw.
    const standalone = defineComponent({
        components: { Tab },
        template: '<Tab name="x" label="X" />',
    });
    await expect(async () => {
        await mountWithGlobals(standalone);
        // The throw happens during setup; rethrow it via flushPromises if needed.
        await flushPromises();
    }).rejects.toThrow(/must be a direct child of <TabGroup>/);
});

// h() satisfies linter (defineComponent only used via template above, but h is
// kept available so future tests can build host components imperatively).
void h;
