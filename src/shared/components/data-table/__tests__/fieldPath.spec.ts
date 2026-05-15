import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveFieldPath, warnUnresolvedField } from '@/shared/components/data-table/fieldPath';

describe('resolveFieldPath', () => {
    it('resolves a top-level field', () => {
        expect(resolveFieldPath({ name: 'Jane' }, 'name')).toBe('Jane');
    });

    it('resolves a nested field via dot notation', () => {
        expect(resolveFieldPath({ tenant: { name: 'Acme' } }, 'tenant.name')).toBe('Acme');
    });

    it('returns undefined when an intermediate segment is missing', () => {
        expect(resolveFieldPath({ tenant: null }, 'tenant.name')).toBeUndefined();
        expect(resolveFieldPath({}, 'a.b.c')).toBeUndefined();
    });

    it('returns undefined for null / non-object roots and empty path', () => {
        expect(resolveFieldPath(null, 'a')).toBeUndefined();
        expect(resolveFieldPath(undefined, 'a')).toBeUndefined();
        expect(resolveFieldPath('scalar', 'a')).toBeUndefined();
        expect(resolveFieldPath({ a: 1 }, '')).toBeUndefined();
    });
});

describe('warnUnresolvedField', () => {
    const warnSpy = vi.spyOn(console, 'warn');

    beforeEach(() => {
        warnSpy.mockClear();
    });

    afterEach(() => {
        warnSpy.mockClear();
    });

    it('warns when the first row resolves undefined for a non-custom column', () => {
        warnUnresolvedField([{ name: 'Jane' }], {
            field: 'missing.path',
            label: 'Missing',
            type: 'text',
        });
        expect(warnSpy).toHaveBeenCalledTimes(1);
        const message = String(warnSpy.mock.calls[0][0]);
        expect(message).toContain('[DataTable]');
        expect(message).toContain('Missing');
        expect(message).toContain('missing.path');
        expect(message).toContain('text');
    });

    it('does not warn when the first row resolves a value (even if later rows would)', () => {
        warnUnresolvedField(
            [
                { name: 'Jane' },
                { name: undefined },
            ],
            { field: 'name', label: 'Name', type: 'text' },
        );
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('skips custom columns regardless of resolution result', () => {
        warnUnresolvedField([{ id: 1 }], {
            field: 'tags',
            label: 'Tags',
            type: 'custom',
        });
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does nothing when the data is empty', () => {
        warnUnresolvedField([], {
            field: 'anything',
            label: 'Anything',
            type: 'text',
        });
        expect(warnSpy).not.toHaveBeenCalled();
    });
});
