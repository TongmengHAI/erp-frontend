import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock PrimeVue's useConfirm so we can intercept the require() calls. This
// isolates the test from PV's runtime, lets us assert on the option shape
// our composable assembles (severity icon, defaultFocus='reject', i18n'd
// labels, etc.), and avoids needing a real Teleport target in jsdom.
const requireSpy = vi.fn();
vi.mock('primevue/useconfirm', () => ({
    useConfirm: () => ({ require: requireSpy }),
}));

import { defineComponent, h } from 'vue';

import { useAppConfirm } from '@/shared/composables/useAppConfirm';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

const TestHost = defineComponent({
    name: 'ConfirmTestHost',
    setup(_, { expose }) {
        const api = useAppConfirm();
        expose(api);
        return () => h('div');
    },
});

interface HostApi {
    confirmDelete: ReturnType<typeof useAppConfirm>['confirmDelete'];
    confirmAction: ReturnType<typeof useAppConfirm>['confirmAction'];
}

async function mountHost(): Promise<HostApi> {
    const w = await mountWithGlobals(TestHost);
    return w.vm as unknown as HostApi;
}

describe('useAppConfirm', () => {
    beforeEach(() => {
        requireSpy.mockClear();
    });

    afterEach(() => {
        requireSpy.mockClear();
    });

    it('confirmDelete fires require() with danger icon, focus on reject, and i18n delete label', async () => {
        const api = await mountHost();
        const onAccept = vi.fn();
        api.confirmDelete({ message: 'Delete this?', onAccept });

        expect(requireSpy).toHaveBeenCalledTimes(1);
        const opts = requireSpy.mock.calls[0][0];
        expect(opts.icon).toBe('pi pi-exclamation-triangle');
        expect(opts.defaultFocus).toBe('reject');
        expect(opts.acceptLabel).toBe('Delete');
        expect(opts.rejectLabel).toBe('Cancel');
        expect(opts.acceptClass).toBe('p-button-danger');
        expect(opts.accept).toBe(onAccept);
    });

    it('confirmAction honors caller-provided severity and acceptLabel', async () => {
        const api = await mountHost();
        api.confirmAction({
            message: 'Reverse?',
            severity: 'warning',
            acceptLabel: 'Reverse Entry',
            onAccept: vi.fn(),
        });

        const opts = requireSpy.mock.calls[0][0];
        expect(opts.icon).toBe('pi pi-exclamation-circle');
        expect(opts.acceptLabel).toBe('Reverse Entry');
        expect(opts.acceptClass).toBe('p-button-warn');
        expect(opts.defaultFocus).toBe('reject');
    });

    it('confirmAction defaults to info severity', async () => {
        const api = await mountHost();
        api.confirmAction({ message: 'Anything?', onAccept: vi.fn() });

        const opts = requireSpy.mock.calls[0][0];
        expect(opts.icon).toBe('pi pi-info-circle');
        expect(opts.acceptClass).toBe('');
    });

    it('reject callback is forwarded when provided', async () => {
        const api = await mountHost();
        const onReject = vi.fn();
        api.confirmDelete({ message: 'Delete?', onAccept: vi.fn(), onReject });

        expect(requireSpy.mock.calls[0][0].reject).toBe(onReject);
    });

    it('reject is optional — composable passes undefined without throwing', async () => {
        const api = await mountHost();
        api.confirmDelete({ message: 'Delete?', onAccept: vi.fn() });

        expect(requireSpy.mock.calls[0][0].reject).toBeUndefined();
    });

    it('detail is concatenated into the message body', async () => {
        const api = await mountHost();
        api.confirmDelete({
            message: 'Delete this?',
            detail: 'This is irreversible.',
            onAccept: vi.fn(),
        });

        const opts = requireSpy.mock.calls[0][0];
        expect(opts.message).toBe('Delete this?\n\nThis is irreversible.');
    });
});
