import { apiClient } from '@/shared/api/client';

import type {
    CreateLeaveRequestRequest,
    DecideLeaveRequestRequest,
    LeaveRequestListParams,
    LeaveRequestListResponse,
    LeaveRequestShowResponse,
    UpdateLeaveRequestRequest,
} from '@/modules/hrm/types/leaveRequest';

// ─────────────────────────────────────────────────────────────────────────────
// Leave Requests API — typed wrappers over apiClient.
//
// Endpoints mirror backend/docs/api/v1/hrm.md:
//   GET    /api/v1/hrm/leave-requests              → LeaveRequestListResponse (paginated)
//   GET    /api/v1/hrm/leave-requests/{id}         → LeaveRequestShowResponse
//   POST   /api/v1/hrm/leave-requests              → LeaveRequestShowResponse (201)
//   PATCH  /api/v1/hrm/leave-requests/{id}         → LeaveRequestShowResponse
//   DELETE /api/v1/hrm/leave-requests/{id}         → 204 No Content
//   POST   /api/v1/hrm/leave-requests/{id}/approve → LeaveRequestShowResponse
//   POST   /api/v1/hrm/leave-requests/{id}/reject  → LeaveRequestShowResponse
//
// PATCH and the two transition endpoints can return 422 with
// error_code='invalid_transition' (the row isn't pending). That status is
// surfaced to the page layer; consumers narrow on InvalidTransitionErrorBody
// to distinguish it from generic 422 field-validation errors.
//
// Same empty-string / undefined stripping as the employees API — see
// cleanParams docblock in api/employees.ts for the rationale.
// ─────────────────────────────────────────────────────────────────────────────

function cleanParams(params: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        if (typeof value === 'string' && value === '') continue;
        out[key] = value;
    }
    return out;
}

export async function listLeaveRequests(
    params: LeaveRequestListParams = {},
): Promise<LeaveRequestListResponse> {
    const res = await apiClient.get<LeaveRequestListResponse>('/hrm/leave-requests', {
        params: cleanParams(params as Record<string, unknown>),
    });
    return res.data;
}

export async function getLeaveRequest(id: number): Promise<LeaveRequestShowResponse> {
    const res = await apiClient.get<LeaveRequestShowResponse>(
        `/hrm/leave-requests/${id}`,
    );
    return res.data;
}

export async function createLeaveRequest(
    payload: CreateLeaveRequestRequest,
): Promise<LeaveRequestShowResponse> {
    const res = await apiClient.post<LeaveRequestShowResponse>(
        '/hrm/leave-requests',
        payload,
    );
    return res.data;
}

export async function updateLeaveRequest(
    id: number,
    payload: UpdateLeaveRequestRequest,
): Promise<LeaveRequestShowResponse> {
    const res = await apiClient.patch<LeaveRequestShowResponse>(
        `/hrm/leave-requests/${id}`,
        payload,
    );
    return res.data;
}

export async function deleteLeaveRequest(id: number): Promise<void> {
    await apiClient.delete(`/hrm/leave-requests/${id}`);
}

export async function approveLeaveRequest(
    id: number,
    payload: DecideLeaveRequestRequest = {},
): Promise<LeaveRequestShowResponse> {
    const res = await apiClient.post<LeaveRequestShowResponse>(
        `/hrm/leave-requests/${id}/approve`,
        payload,
    );
    return res.data;
}

export async function rejectLeaveRequest(
    id: number,
    payload: DecideLeaveRequestRequest = {},
): Promise<LeaveRequestShowResponse> {
    const res = await apiClient.post<LeaveRequestShowResponse>(
        `/hrm/leave-requests/${id}/reject`,
        payload,
    );
    return res.data;
}
