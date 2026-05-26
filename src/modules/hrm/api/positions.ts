import { apiClient } from '@/shared/api/client';

import type {
    CreatePositionRequest,
    PositionListParams,
    PositionListResponse,
    PositionShowResponse,
    UpdatePositionRequest,
} from '@/modules/hrm/types/position';

// ─────────────────────────────────────────────────────────────────────────────
// Positions API — typed wrappers over apiClient. Mirror of departments.ts.
//
// Endpoints mirror backend/docs/api/v1/hrm.md:
//   GET    /api/v1/hrm/positions          → PositionListResponse (paginated)
//   GET    /api/v1/hrm/positions/{id}     → PositionShowResponse
//   POST   /api/v1/hrm/positions          → PositionShowResponse (201)
//   PATCH  /api/v1/hrm/positions/{id}     → PositionShowResponse
//   DELETE /api/v1/hrm/positions/{id}     → 204
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

export async function listPositions(
    params: PositionListParams = {},
): Promise<PositionListResponse> {
    const res = await apiClient.get<PositionListResponse>('/hrm/positions', {
        params: cleanParams(params as Record<string, unknown>),
    });
    return res.data;
}

export async function getPosition(id: number): Promise<PositionShowResponse> {
    const res = await apiClient.get<PositionShowResponse>(`/hrm/positions/${id}`);
    return res.data;
}

export async function createPosition(
    payload: CreatePositionRequest,
): Promise<PositionShowResponse> {
    const res = await apiClient.post<PositionShowResponse>('/hrm/positions', payload);
    return res.data;
}

export async function updatePosition(
    id: number,
    payload: UpdatePositionRequest,
): Promise<PositionShowResponse> {
    const res = await apiClient.patch<PositionShowResponse>(
        `/hrm/positions/${id}`,
        payload,
    );
    return res.data;
}

export async function deletePosition(id: number): Promise<void> {
    await apiClient.delete(`/hrm/positions/${id}`);
}
