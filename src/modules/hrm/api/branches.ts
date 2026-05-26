import { apiClient } from '@/shared/api/client';

import type {
    BranchListParams,
    BranchListResponse,
    BranchShowResponse,
    CreateBranchRequest,
    UpdateBranchRequest,
} from '@/modules/hrm/types/branch';

// ─────────────────────────────────────────────────────────────────────────────
// Branches API — typed wrappers over apiClient. Mirror of positions.ts.
//
// Endpoints mirror backend/docs/api/v1/hrm.md:
//   GET    /api/v1/hrm/branches         → BranchListResponse (paginated)
//   GET    /api/v1/hrm/branches/{id}    → BranchShowResponse
//   POST   /api/v1/hrm/branches         → BranchShowResponse (201)
//   PATCH  /api/v1/hrm/branches/{id}    → BranchShowResponse
//   DELETE /api/v1/hrm/branches/{id}    → 204
//
// Same cleanParams + 5 CRUD wrappers as the other modules.
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

export async function listBranches(
    params: BranchListParams = {},
): Promise<BranchListResponse> {
    const res = await apiClient.get<BranchListResponse>('/hrm/branches', {
        params: cleanParams(params as Record<string, unknown>),
    });
    return res.data;
}

export async function getBranch(id: number): Promise<BranchShowResponse> {
    const res = await apiClient.get<BranchShowResponse>(`/hrm/branches/${id}`);
    return res.data;
}

export async function createBranch(
    payload: CreateBranchRequest,
): Promise<BranchShowResponse> {
    const res = await apiClient.post<BranchShowResponse>('/hrm/branches', payload);
    return res.data;
}

export async function updateBranch(
    id: number,
    payload: UpdateBranchRequest,
): Promise<BranchShowResponse> {
    const res = await apiClient.patch<BranchShowResponse>(
        `/hrm/branches/${id}`,
        payload,
    );
    return res.data;
}

export async function deleteBranch(id: number): Promise<void> {
    await apiClient.delete(`/hrm/branches/${id}`);
}
