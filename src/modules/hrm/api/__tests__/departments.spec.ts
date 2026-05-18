import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as departmentsApi from '@/modules/hrm/api/departments';
import { apiClient } from '@/shared/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// departments API client — request-shape contract. Mirrors the Employee
// API spec. cleanParams() empty-filter stripping is the load-bearing test:
// an empty ?search= would ILIKE-match every row, surfacing zero rows as
// "every row matches the wildcard."
// ─────────────────────────────────────────────────────────────────────────────

describe('departments API', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('listDepartments GETs /hrm/departments with params unchanged when truthy', async () => {
        const get = vi
            .spyOn(apiClient, 'get')
            .mockResolvedValue({ data: { data: [], meta: {}, links: {} } });

        await departmentsApi.listDepartments({ status: 'active', page: 2, per_page: 50 });

        expect(get).toHaveBeenCalledWith('/hrm/departments', {
            params: { status: 'active', page: 2, per_page: 50 },
        });
    });

    it('listDepartments STRIPS empty string and null/undefined params before sending', async () => {
        const get = vi
            .spyOn(apiClient, 'get')
            .mockResolvedValue({ data: { data: [], meta: {}, links: {} } });

        await departmentsApi.listDepartments({ search: '', status: undefined, page: 1 });

        expect(get).toHaveBeenCalledWith('/hrm/departments', {
            params: { page: 1 },
        });
    });

    it('getDepartment GETs /hrm/departments/{id}', async () => {
        const get = vi
            .spyOn(apiClient, 'get')
            .mockResolvedValue({ data: { data: { id: 42 } } });

        await departmentsApi.getDepartment(42);

        expect(get).toHaveBeenCalledWith('/hrm/departments/42');
    });

    it('createDepartment POSTs /hrm/departments with the payload verbatim', async () => {
        const post = vi
            .spyOn(apiClient, 'post')
            .mockResolvedValue({ data: { data: { id: 7 } } });

        const payload = {
            code: 'D-7',
            name: 'Test Department',
            description: 'A test.',
            status: 'active' as const,
        };
        await departmentsApi.createDepartment(payload);

        expect(post).toHaveBeenCalledWith('/hrm/departments', payload);
    });

    it('updateDepartment PATCHes /hrm/departments/{id} with the partial payload', async () => {
        const patch = vi
            .spyOn(apiClient, 'patch')
            .mockResolvedValue({ data: { data: { id: 7 } } });

        await departmentsApi.updateDepartment(7, { status: 'archived' });

        expect(patch).toHaveBeenCalledWith('/hrm/departments/7', { status: 'archived' });
    });

    it('deleteDepartment DELETEs /hrm/departments/{id} and returns void', async () => {
        const del = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: undefined });

        const result = await departmentsApi.deleteDepartment(7);

        expect(del).toHaveBeenCalledWith('/hrm/departments/7');
        expect(result).toBeUndefined();
    });
});
