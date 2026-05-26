import { apiClient } from '@/shared/api/client';

import type {
    CreateLeaveBalanceRequest,
    LeaveBalanceListParams,
    LeaveBalanceListResponse,
    LeaveBalanceShowResponse,
    UpdateLeaveBalanceRequest,
} from '@/modules/hrm/types/leaveBalance';

// ─────────────────────────────────────────────────────────────────────────────
// Leave Balances API — typed wrappers over apiClient. Mirror of branches.ts.
//
// Endpoints mirror backend/docs/api/v1/hrm.md:
//   GET    /api/v1/hrm/leave-balances         → LeaveBalanceListResponse
//   GET    /api/v1/hrm/leave-balances/{id}    → LeaveBalanceShowResponse
//                                                (with consuming_leave_requests)
//   POST   /api/v1/hrm/leave-balances         → LeaveBalanceShowResponse (201)
//   PATCH  /api/v1/hrm/leave-balances/{id}    → LeaveBalanceShowResponse
//   DELETE /api/v1/hrm/leave-balances/{id}    → 204
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

export async function listLeaveBalances(
    params: LeaveBalanceListParams = {},
): Promise<LeaveBalanceListResponse> {
    const res = await apiClient.get<LeaveBalanceListResponse>('/hrm/leave-balances', {
        params: cleanParams(params as Record<string, unknown>),
    });
    return res.data;
}

export async function getLeaveBalance(id: number): Promise<LeaveBalanceShowResponse> {
    const res = await apiClient.get<LeaveBalanceShowResponse>(`/hrm/leave-balances/${id}`);
    return res.data;
}

export async function createLeaveBalance(
    payload: CreateLeaveBalanceRequest,
): Promise<LeaveBalanceShowResponse> {
    const res = await apiClient.post<LeaveBalanceShowResponse>('/hrm/leave-balances', payload);
    return res.data;
}

export async function updateLeaveBalance(
    id: number,
    payload: UpdateLeaveBalanceRequest,
): Promise<LeaveBalanceShowResponse> {
    const res = await apiClient.patch<LeaveBalanceShowResponse>(
        `/hrm/leave-balances/${id}`,
        payload,
    );
    return res.data;
}

export async function deleteLeaveBalance(id: number): Promise<void> {
    await apiClient.delete(`/hrm/leave-balances/${id}`);
}
