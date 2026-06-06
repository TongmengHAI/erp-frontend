import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';

import PermissionPicker from '@/modules/admin/components/PermissionPicker.vue';
import * as permissionsApi from '@/modules/admin/api/permissions';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// PermissionPicker tristate behavior — six transitions.
//
// Per CLAUDE.md §10.4 applied to UI logic: each transition gets a
// dedicated test with a specific name so a future regression is
// readable from the test failure alone.
//
// The six transitions (mirrors Phase 2B Session 4 deliberate item #1):
//   T1. Parent CHECK   → all children become checked
//   T2. Parent UNCHECK → all children become unchecked
//   T3. Child check  + ALL  siblings checked   → parent = checked
//   T4. Child check  + SOME siblings unchecked → parent = indeterminate
//   T5. Child uncheck + ALL siblings unchecked → parent = unchecked
//   T6. Child uncheck + SOME siblings checked  → parent = indeterminate
//
// Catalog fixture: domain 'hrm' with three children (view / create /
// update). Three children = enough to exercise "all", "some", "none"
// states cleanly.
// ─────────────────────────────────────────────────────────────────────────────

const FIXTURE = {
    data: {
        domains: { hrm: 'HRM' },
        permissions: {
            'hrm.employee.view': 'View employees',
            'hrm.employee.create': 'Create employees',
            'hrm.employee.update': 'Update employees',
        },
        permission_ids: {
            'hrm.employee.view': 1,
            'hrm.employee.create': 2,
            'hrm.employee.update': 3,
        },
    },
};

function freshVueQueryPlugin() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return [VueQueryPlugin, { queryClient: client }] as const;
}

interface MountOpts {
    initialIds: number[];
}

async function mountPicker(opts: MountOpts) {
    vi.spyOn(permissionsApi, 'getPermissionDescriptions').mockResolvedValue(
        FIXTURE,
    );
    const w = await mountWithGlobals(PermissionPicker, {
        extraPlugins: [freshVueQueryPlugin()],
        props: { modelValue: opts.initialIds },
    });
    // Wait for the descriptions query to resolve + the picker to render.
    await new Promise((resolve) => setTimeout(resolve, 200));
    await w.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await w.vm.$nextTick();
    return w;
}

function parentEl(w: Awaited<ReturnType<typeof mountPicker>>): HTMLInputElement {
    const el = w.find('[data-testid="permission-picker-parent-hrm"]')
        .element as HTMLInputElement;
    return el;
}

function lastEmittedIds(w: Awaited<ReturnType<typeof mountPicker>>): number[] {
    const events = w.emitted('update:modelValue');
    expect(events).toBeTruthy();
    return events![events!.length - 1][0] as number[];
}

describe('PermissionPicker — tristate transitions', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("T1 — Parent CHECK → all children become checked (cascade down)", async () => {
        // Initial state: none selected.
        const w = await mountPicker({ initialIds: [] });
        expect(parentEl(w).dataset.parentState).toBe('none');

        // Dispatch parent toggle → checked.
        const parent = parentEl(w);
        parent.checked = true;
        parent.dispatchEvent(new Event('change'));
        await w.vm.$nextTick();

        // Emit carries all three child IDs.
        expect(lastEmittedIds(w).sort()).toEqual([1, 2, 3]);
    });

    it("T2 — Parent UNCHECK → all children become unchecked (cascade down)", async () => {
        // Initial: all selected.
        const w = await mountPicker({ initialIds: [1, 2, 3] });
        expect(parentEl(w).dataset.parentState).toBe('all');

        const parent = parentEl(w);
        parent.checked = false;
        parent.dispatchEvent(new Event('change'));
        await w.vm.$nextTick();

        // Emit carries empty array.
        expect(lastEmittedIds(w)).toEqual([]);
    });

    it("T3 — Child check + ALL siblings already checked → parent transitions to 'all' (checked)", async () => {
        // Initial: 2 of 3 checked (1 + 2); checking the third should
        // bring parent to 'all'.
        const w = await mountPicker({ initialIds: [1, 2] });
        expect(parentEl(w).dataset.parentState).toBe('some');

        // Check the third child (id 3).
        const child3 = w.find('[data-testid="permission-picker-child-3"]')
            .element as HTMLInputElement;
        child3.checked = true;
        child3.dispatchEvent(new Event('change'));
        await w.vm.$nextTick();

        // Parent's recomputed state must be 'all'.
        // The emit shape is what propagates; the picker re-renders from
        // the parent's bound modelValue. We assert the emitted shape
        // because the parent component decides whether to accept it.
        expect(lastEmittedIds(w).sort()).toEqual([1, 2, 3]);
    });

    it("T4 — Child check + SOME siblings unchecked → parent transitions to 'some' (indeterminate)", async () => {
        // Initial: none selected; checking ONE child should leave the
        // parent in 'some' (1 of 3 selected).
        const w = await mountPicker({ initialIds: [] });
        expect(parentEl(w).dataset.parentState).toBe('none');

        const child1 = w.find('[data-testid="permission-picker-child-1"]')
            .element as HTMLInputElement;
        child1.checked = true;
        child1.dispatchEvent(new Event('change'));
        await w.vm.$nextTick();

        expect(lastEmittedIds(w).sort()).toEqual([1]);

        // Re-mount the parent with the new modelValue to verify parent
        // state lands at 'some'. The picker is a controlled component;
        // its parent state derives from modelValue.
        const w2 = await mountPicker({ initialIds: [1] });
        expect(parentEl(w2).dataset.parentState).toBe('some');
        // DOM indeterminate flag also set by the imperative
        // watchEffect — defense in depth.
        expect(parentEl(w2).indeterminate).toBe(true);
    });

    it("T5 — Child uncheck + ALL siblings already unchecked → parent transitions to 'none' (unchecked)", async () => {
        // Initial: only ONE selected; unchecking it leaves zero.
        const w = await mountPicker({ initialIds: [2] });
        expect(parentEl(w).dataset.parentState).toBe('some');

        const child2 = w.find('[data-testid="permission-picker-child-2"]')
            .element as HTMLInputElement;
        child2.checked = false;
        child2.dispatchEvent(new Event('change'));
        await w.vm.$nextTick();

        expect(lastEmittedIds(w)).toEqual([]);

        // Verify parent state on a re-mount with the new modelValue.
        const w2 = await mountPicker({ initialIds: [] });
        expect(parentEl(w2).dataset.parentState).toBe('none');
        expect(parentEl(w2).indeterminate).toBe(false);
    });

    it("T6 — Child uncheck + SOME siblings checked → parent transitions to 'some' (indeterminate)", async () => {
        // Initial: all three checked; unchecking one leaves 2 of 3
        // selected, so parent should be 'some'.
        const w = await mountPicker({ initialIds: [1, 2, 3] });
        expect(parentEl(w).dataset.parentState).toBe('all');

        const child1 = w.find('[data-testid="permission-picker-child-1"]')
            .element as HTMLInputElement;
        child1.checked = false;
        child1.dispatchEvent(new Event('change'));
        await w.vm.$nextTick();

        expect(lastEmittedIds(w).sort()).toEqual([2, 3]);

        // Verify parent state on re-mount.
        const w2 = await mountPicker({ initialIds: [2, 3] });
        expect(parentEl(w2).dataset.parentState).toBe('some');
        expect(parentEl(w2).indeterminate).toBe(true);
    });
});
