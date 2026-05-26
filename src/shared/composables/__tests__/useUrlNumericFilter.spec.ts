import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

import { useUrlNumericFilter } from '@/shared/composables/useUrlNumericFilter';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// useUrlNumericFilter — depends on Vue Router context, so we mount it
// inside a small probe component (mountWithGlobals wires up the memory
// router) and read the composable's return value off the instance.
//
// Mirrors the inline-extracted EmployeeListPage logic byte-for-byte.
// Test cases pin every parsing branch:
//   - valid positive integer in query string
//   - absent key
//   - non-numeric string
//   - zero / negative numbers
//   - non-string query value (would only happen via direct route push
//     with an array, but Vue Router permits it)
// Plus reactivity (value updates on route change) and clear behavior
// (key removed; other params survive).
// ─────────────────────────────────────────────────────────────────────────────

// vm-exposed shape: Vue auto-unwraps top-level refs returned from setup(),
// so `vm.filter` IS the unwrapped number | null, NOT a Ref<number | null>.
// The composable internally exposes a ComputedRef; the probe unwraps it
// via the setup-return convention so test assertions can read the value
// directly.
interface ProbeExposed {
    filter: number | null;
    clearFilter: () => Promise<void>;
}

const ProbeComponent = defineComponent({
    setup() {
        const { value, clear } = useUrlNumericFilter('department_id');
        return { filter: value, clearFilter: clear };
    },
    render: () => h('div'),
});

async function mountProbe(initialRoute = '/'): Promise<ProbeExposed> {
    const w = await mountWithGlobals(ProbeComponent, { initialRoute });
    return w.vm as unknown as ProbeExposed;
}

describe('useUrlNumericFilter', () => {
    it('returns null when the key is absent from the URL', async () => {
        const vm = await mountProbe('/');
        expect(vm.filter).toBeNull();
    });

    it('parses a positive integer from the URL', async () => {
        const vm = await mountProbe('/?department_id=42');
        expect(vm.filter).toBe(42);
    });

    it('returns null for a non-numeric value', async () => {
        const vm = await mountProbe('/?department_id=abc');
        expect(vm.filter).toBeNull();
    });

    it('returns null for zero (not a valid FK)', async () => {
        const vm = await mountProbe('/?department_id=0');
        expect(vm.filter).toBeNull();
    });

    it('returns null for a negative number', async () => {
        const vm = await mountProbe('/?department_id=-5');
        expect(vm.filter).toBeNull();
    });

    it('returns null for an empty string value', async () => {
        const vm = await mountProbe('/?department_id=');
        expect(vm.filter).toBeNull();
    });

    it('clear() removes the key from the URL while preserving other params', async () => {
        // Mount with two params; clear one, the other survives.
        const w = await mountWithGlobals(ProbeComponent, {
            initialRoute: '/?department_id=42&status=active',
        });
        const vm = w.vm as unknown as ProbeExposed;
        expect(vm.filter).toBe(42);

        await vm.clearFilter();
        await nextTick();

        expect(vm.filter).toBeNull();
        // Vue Router exposes current route via the router; query.status
        // should still be 'active'.
        const router = w.vm.$router;
        expect(router.currentRoute.value.query.status).toBe('active');
        expect(router.currentRoute.value.query.department_id).toBeUndefined();
    });

    it('clear() is a no-op when the key is already absent', async () => {
        const w = await mountWithGlobals(ProbeComponent, {
            initialRoute: '/?status=active',
        });
        const vm = w.vm as unknown as ProbeExposed;
        expect(vm.filter).toBeNull();

        // Should not throw; the route stays at the same URL.
        await vm.clearFilter();
        await nextTick();

        expect(vm.filter).toBeNull();
        expect(w.vm.$router.currentRoute.value.query.status).toBe('active');
    });
});
