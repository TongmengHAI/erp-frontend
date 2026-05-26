import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as attendanceApi from '@/modules/hrm/api/attendance';
import { apiClient } from '@/shared/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// attendance API client — locks the request-side contract.
//
// Same precedent as employees, departments, leaveRequests specs.
// ─────────────────────────────────────────────────────────────────────────────

describe('attendance API', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('listAttendance GETs /hrm/attendance with params unchanged when truthy', async () => {
        const get = vi
            .spyOn(apiClient, 'get')
            .mockResolvedValue({ data: { data: [], meta: {}, links: {} } });

        await attendanceApi.listAttendance({
            employee_id: 7,
            status: 'present',
            from: '2026-05-01',
            to: '2026-05-31',
            page: 2,
            per_page: 50,
        });

        expect(get).toHaveBeenCalledWith('/hrm/attendance', {
            params: {
                employee_id: 7,
                status: 'present',
                from: '2026-05-01',
                to: '2026-05-31',
                page: 2,
                per_page: 50,
            },
        });
    });

    it('listAttendance STRIPS empty string / null / undefined params before sending', async () => {
        const get = vi
            .spyOn(apiClient, 'get')
            .mockResolvedValue({ data: { data: [], meta: {}, links: {} } });

        await attendanceApi.listAttendance({
            status: undefined,
            from: '',
            page: 1,
        });

        expect(get).toHaveBeenCalledWith('/hrm/attendance', {
            params: { page: 1 },
        });
    });

    it('getAttendance GETs /hrm/attendance/{id}', async () => {
        const get = vi
            .spyOn(apiClient, 'get')
            .mockResolvedValue({ data: { data: { id: 42 } } });

        await attendanceApi.getAttendance(42);

        expect(get).toHaveBeenCalledWith('/hrm/attendance/42');
    });

    it('createAttendance POSTs /hrm/attendance with the payload verbatim including HH:MM:SS times', async () => {
        const post = vi
            .spyOn(apiClient, 'post')
            .mockResolvedValue({ data: { data: { id: 7 } } });

        const payload = {
            employee_id: 1,
            date: '2026-05-14',
            clock_in: '09:00:00',
            clock_out: '18:00:00',
            status: 'present' as const,
            notes: 'on time',
        };
        await attendanceApi.createAttendance(payload);

        expect(post).toHaveBeenCalledWith('/hrm/attendance', payload);
    });

    it('createAttendance preserves null clock times (absent / on_leave records have no times)', async () => {
        const post = vi
            .spyOn(apiClient, 'post')
            .mockResolvedValue({ data: { data: { id: 7 } } });

        await attendanceApi.createAttendance({
            employee_id: 1,
            date: '2026-05-15',
            clock_in: null,
            clock_out: null,
            status: 'absent',
            notes: 'no-show',
        });

        expect(post).toHaveBeenCalledWith('/hrm/attendance', {
            employee_id: 1,
            date: '2026-05-15',
            clock_in: null,
            clock_out: null,
            status: 'absent',
            notes: 'no-show',
        });
    });

    it('updateAttendance PATCHes /hrm/attendance/{id} with the partial payload', async () => {
        const patch = vi
            .spyOn(apiClient, 'patch')
            .mockResolvedValue({ data: { data: { id: 7 } } });

        await attendanceApi.updateAttendance(7, { notes: 'updated' });

        expect(patch).toHaveBeenCalledWith('/hrm/attendance/7', { notes: 'updated' });
    });

    it('deleteAttendance DELETEs /hrm/attendance/{id} and returns void', async () => {
        const del = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: undefined });

        const result = await attendanceApi.deleteAttendance(7);

        expect(del).toHaveBeenCalledWith('/hrm/attendance/7');
        expect(result).toBeUndefined();
    });
});
