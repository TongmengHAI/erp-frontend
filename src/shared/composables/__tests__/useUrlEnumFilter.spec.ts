import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

import { useUrlEnumFilter } from '@/shared/composables/useUrlEnumFilter';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// useUrlEnumFilter — sibling of useUrlNumericFilter. Same probe-component
// pattern; the composable depends on Vue Router context.
//
// Allowlist parameter is the load-bearing safeguard tested explicitly
// (invalid values fall back to null rather than landing in page state).
// ─────────────────────────────────────────────────────────────────────────────

type TestStatus = 'pending' | 'approved' | 'rejected';
const STATUSES: readonly TestStatus[] = Object.freeze(['pending', 'approved', 'rejected']);

interface ProbeExposed {
    filter: TestStatus | null;
    setFilter: (next: TestStatus | null) => Promise<void>;
    clearFilter: () => Promise<void>;
}

const ProbeComponent = defineComponent({
    setup() {
        const { value, set, clear } = useUrlEnumFilter<TestStatus>('status', STATUSES);
        return { filter: value, setFilter: set, clearFilter: clear };
    },
    render: () => h('div'),
});

async function mountProbe(initialRoute = '/'): Promise<ProbeExposed> {
    const w = await mountWithGlobals(ProbeComponent, { initialRoute });
    return w.vm as unknown as ProbeExposed;
}

describe('useUrlEnumFilter', () => {
    it('returns null when the key is absent from the URL', async () => {
        const vm = await mountProbe('/');
        expect(vm.filter).toBeNull();
    });

    it('parses an allowlisted value from the URL', async () => {
        const vm = await mountProbe('/?status=pending');
        expect(vm.filter).toBe('pending');
    });

    it('LOAD-BEARING: returns null for a value NOT in the allowlist (rejects URL forgery)', async () => {
        // A deep-link to /?status=arbitrary-garbage shouldn't land any
        // value in page state. Allowlist narrowing is the safeguard.
        const vm = await mountProbe('/?status=arbitrary-garbage');
        expect(vm.filter).toBeNull();
    });

    it('returns null for an empty string value', async () => {
        const vm = await mountProbe('/?status=');
        expect(vm.filter).toBeNull();
    });

    it('set(value) writes the key into the URL and the next read returns it', async () => {
        const w = await mountWithGlobals(ProbeComponent, { initialRoute: '/' });
        const vm = w.vm as unknown as ProbeExposed;
        expect(vm.filter).toBeNull();

        await vm.setFilter('approved');
        await nextTick();

        expect(vm.filter).toBe('approved');
        expect(w.vm.$router.currentRoute.value.query.status).toBe('approved');
    });

    it('set(null) removes the key (equivalent to clear)', async () => {
        const w = await mountWithGlobals(ProbeComponent, {
            initialRoute: '/?status=pending',
        });
        const vm = w.vm as unknown as ProbeExposed;
        expect(vm.filter).toBe('pending');

        await vm.setFilter(null);
        await nextTick();

        expect(vm.filter).toBeNull();
        expect(w.vm.$router.currentRoute.value.query.status).toBeUndefined();
    });

    it('clear() removes the key while preserving other params', async () => {
        const w = await mountWithGlobals(ProbeComponent, {
            initialRoute: '/?status=pending&leave_type=annual',
        });
        const vm = w.vm as unknown as ProbeExposed;
        expect(vm.filter).toBe('pending');

        await vm.clearFilter();
        await nextTick();

        expect(vm.filter).toBeNull();
        expect(w.vm.$router.currentRoute.value.query.leave_type).toBe('annual');
        expect(w.vm.$router.currentRoute.value.query.status).toBeUndefined();
    });
});
