import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as leaveRequestsApi from '@/modules/hrm/api/leaveRequests';
import { apiClient } from '@/shared/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// leaveRequests API client — locks the request-side contract.
//
// The 9-step live HTTP smoke run during the backend slice covered the
// response paths end-to-end; this spec ensures a careless refactor
// can't silently change the request shape (path, method, payload, params).
// Same precedent as the employees and departments API specs.
//
// The two transition endpoints (/approve, /reject) get explicit tests
// since they POST with an optional `note` payload — a regression that
// silently drops the note (e.g. accidental param-stripping) would
// erase the manager's reasoning from the audit trail.
// ─────────────────────────────────────────────────────────────────────────────

describe('leaveRequests API', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('listLeaveRequests GETs /hrm/leave-requests with params unchanged when truthy', async () => {
        const get = vi
            .spyOn(apiClient, 'get')
            .mockResolvedValue({ data: { data: [], meta: {}, links: {} } });

        await leaveRequestsApi.listLeaveRequests({
            status: 'pending',
            leave_type: 'annual',
            employee_id: 7,
            page: 2,
            per_page: 50,
        });

        expect(get).toHaveBeenCalledWith('/hrm/leave-requests', {
            params: {
                status: 'pending',
                leave_type: 'annual',
                employee_id: 7,
                page: 2,
                per_page: 50,
            },
        });
    });

    it('listLeaveRequests STRIPS empty string and null/undefined params before sending', async () => {
        const get = vi
            .spyOn(apiClient, 'get')
            .mockResolvedValue({ data: { data: [], meta: {}, links: {} } });

        await leaveRequestsApi.listLeaveRequests({
            status: undefined,
            from: '',
            page: 1,
        });

        expect(get).toHaveBeenCalledWith('/hrm/leave-requests', {
            params: { page: 1 },
        });
    });

    it('getLeaveRequest GETs /hrm/leave-requests/{id}', async () => {
        const get = vi
            .spyOn(apiClient, 'get')
            .mockResolvedValue({ data: { data: { id: 42 } } });

        await leaveRequestsApi.getLeaveRequest(42);

        expect(get).toHaveBeenCalledWith('/hrm/leave-requests/42');
    });

    it('createLeaveRequest POSTs /hrm/leave-requests with the payload verbatim', async () => {
        const post = vi
            .spyOn(apiClient, 'post')
            .mockResolvedValue({ data: { data: { id: 7 } } });

        const payload = {
            employee_id: 1,
            leave_type: 'annual' as const,
            start_date: '2026-06-01',
            end_date: '2026-06-05',
            reason: 'Family event.',
        };
        await leaveRequestsApi.createLeaveRequest(payload);

        expect(post).toHaveBeenCalledWith('/hrm/leave-requests', payload);
    });

    it('updateLeaveRequest PATCHes /hrm/leave-requests/{id} with the partial payload', async () => {
        const patch = vi
            .spyOn(apiClient, 'patch')
            .mockResolvedValue({ data: { data: { id: 7 } } });

        await leaveRequestsApi.updateLeaveRequest(7, { reason: 'updated' });

        expect(patch).toHaveBeenCalledWith('/hrm/leave-requests/7', { reason: 'updated' });
    });

    it('deleteLeaveRequest DELETEs /hrm/leave-requests/{id} and returns void', async () => {
        const del = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: undefined });

        const result = await leaveRequestsApi.deleteLeaveRequest(7);

        expect(del).toHaveBeenCalledWith('/hrm/leave-requests/7');
        expect(result).toBeUndefined();
    });

    it('approveLeaveRequest POSTs /hrm/leave-requests/{id}/approve with the note payload', async () => {
        const post = vi
            .spyOn(apiClient, 'post')
            .mockResolvedValue({ data: { data: { id: 7 } } });

        await leaveRequestsApi.approveLeaveRequest(7, { note: 'looks good' });

        expect(post).toHaveBeenCalledWith('/hrm/leave-requests/7/approve', {
            note: 'looks good',
        });
    });

    it('approveLeaveRequest POSTs with empty payload when note is omitted', async () => {
        // The note is optional. The page passes an empty object when the
        // manager didn't add a note. Backend accepts {} (the FormRequest's
        // note rule is nullable).
        const post = vi
            .spyOn(apiClient, 'post')
            .mockResolvedValue({ data: { data: { id: 7 } } });

        await leaveRequestsApi.approveLeaveRequest(7);

        expect(post).toHaveBeenCalledWith('/hrm/leave-requests/7/approve', {});
    });

    it('rejectLeaveRequest POSTs /hrm/leave-requests/{id}/reject with the note payload', async () => {
        const post = vi
            .spyOn(apiClient, 'post')
            .mockResolvedValue({ data: { data: { id: 7 } } });

        await leaveRequestsApi.rejectLeaveRequest(7, { note: 'no capacity' });

        expect(post).toHaveBeenCalledWith('/hrm/leave-requests/7/reject', {
            note: 'no capacity',
        });
    });
});
