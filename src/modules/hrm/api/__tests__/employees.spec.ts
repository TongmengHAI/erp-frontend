import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as employeesApi from '@/modules/hrm/api/employees';
import { apiClient } from '@/shared/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// employees API client — verifies the request shape the live backend
// accepts (paths, methods, query-param hygiene). The 7 live HTTP smokes
// during Day 5 verification covered the response paths end-to-end; this
// spec locks the request-side contract so a careless refactor can't
// silently break it.
// ─────────────────────────────────────────────────────────────────────────────

describe('employees API', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('listEmployees GETs /hrm/employees with params unchanged when truthy', async () => {
        const get = vi
            .spyOn(apiClient, 'get')
            .mockResolvedValue({ data: { data: [], meta: {}, links: {} } });

        await employeesApi.listEmployees({
            status: 'active',
            department_id: 7,
            page: 2,
            per_page: 50,
        });

        expect(get).toHaveBeenCalledWith('/hrm/employees', {
            params: { status: 'active', department_id: 7, page: 2, per_page: 50 },
        });
    });

    it('listEmployees STRIPS empty string and null/undefined params before sending', async () => {
        // The load-bearing test: an empty `?search=` would ILIKE-match
        // everything, surfacing zero rows as "every row matches the
        // wildcard." cleanParams() catches this before the request.
        const get = vi
            .spyOn(apiClient, 'get')
            .mockResolvedValue({ data: { data: [], meta: {}, links: {} } });

        await employeesApi.listEmployees({ search: '', status: undefined, page: 1 });

        expect(get).toHaveBeenCalledWith('/hrm/employees', {
            params: { page: 1 },
        });
    });

    it('getEmployee GETs /hrm/employees/{id}', async () => {
        const get = vi
            .spyOn(apiClient, 'get')
            .mockResolvedValue({ data: { data: { id: 42 } } });

        await employeesApi.getEmployee(42);

        expect(get).toHaveBeenCalledWith('/hrm/employees/42');
    });

    it('createEmployee POSTs /hrm/employees with the payload verbatim', async () => {
        const post = vi
            .spyOn(apiClient, 'post')
            .mockResolvedValue({ data: { data: { id: 7 } } });

        const payload = {
            employee_code: 'E-7',
            full_name: 'Test',
            email: null,
            job_title: 'QA',
            hire_date: '2026-05-19',
            status: 'active' as const,
        };
        await employeesApi.createEmployee(payload);

        expect(post).toHaveBeenCalledWith('/hrm/employees', payload);
    });

    it('updateEmployee PATCHes /hrm/employees/{id} with the partial payload', async () => {
        const patch = vi
            .spyOn(apiClient, 'patch')
            .mockResolvedValue({ data: { data: { id: 7 } } });

        await employeesApi.updateEmployee(7, { status: 'on_leave' });

        expect(patch).toHaveBeenCalledWith('/hrm/employees/7', { status: 'on_leave' });
    });

    it('deleteEmployee DELETEs /hrm/employees/{id} and returns void', async () => {
        const del = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: undefined });

        const result = await employeesApi.deleteEmployee(7);

        expect(del).toHaveBeenCalledWith('/hrm/employees/7');
        expect(result).toBeUndefined();
    });
});
