import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as positionsApi from '@/modules/hrm/api/positions';
import { apiClient } from '@/shared/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// positions API — locks the request-side contract. Same precedent as
// the other module specs.
// ─────────────────────────────────────────────────────────────────────────────

describe('positions API', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('listPositions GETs /hrm/positions with params unchanged when truthy', async () => {
        const get = vi
            .spyOn(apiClient, 'get')
            .mockResolvedValue({ data: { data: [], meta: {}, links: {} } });

        await positionsApi.listPositions({
            search: 'manager',
            status: 'active',
            page: 2,
            per_page: 50,
        });

        expect(get).toHaveBeenCalledWith('/hrm/positions', {
            params: { search: 'manager', status: 'active', page: 2, per_page: 50 },
        });
    });

    it('listPositions STRIPS empty / null / undefined params', async () => {
        const get = vi
            .spyOn(apiClient, 'get')
            .mockResolvedValue({ data: { data: [], meta: {}, links: {} } });

        await positionsApi.listPositions({ search: '', status: undefined, page: 1 });

        expect(get).toHaveBeenCalledWith('/hrm/positions', { params: { page: 1 } });
    });

    it('getPosition GETs /hrm/positions/{id}', async () => {
        const get = vi
            .spyOn(apiClient, 'get')
            .mockResolvedValue({ data: { data: { id: 42 } } });

        await positionsApi.getPosition(42);

        expect(get).toHaveBeenCalledWith('/hrm/positions/42');
    });

    it('createPosition POSTs /hrm/positions with the payload verbatim', async () => {
        const post = vi
            .spyOn(apiClient, 'post')
            .mockResolvedValue({ data: { data: { id: 7 } } });

        const payload = {
            code: 'P-NEW',
            title: 'New Role',
            description: null,
            status: 'active' as const,
        };
        await positionsApi.createPosition(payload);

        expect(post).toHaveBeenCalledWith('/hrm/positions', payload);
    });

    it('updatePosition PATCHes /hrm/positions/{id} with the partial payload', async () => {
        const patch = vi
            .spyOn(apiClient, 'patch')
            .mockResolvedValue({ data: { data: { id: 7 } } });

        await positionsApi.updatePosition(7, { status: 'archived' });

        expect(patch).toHaveBeenCalledWith('/hrm/positions/7', { status: 'archived' });
    });

    it('deletePosition DELETEs /hrm/positions/{id} and returns void', async () => {
        const del = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: undefined });

        const result = await positionsApi.deletePosition(7);

        expect(del).toHaveBeenCalledWith('/hrm/positions/7');
        expect(result).toBeUndefined();
    });
});
