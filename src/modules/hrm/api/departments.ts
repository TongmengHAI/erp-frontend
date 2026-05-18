import { apiClient } from '@/shared/api/client';

import type {
    CreateDepartmentRequest,
    DepartmentListParams,
    DepartmentListResponse,
    DepartmentShowResponse,
    UpdateDepartmentRequest,
} from '@/modules/hrm/types/department';

// ─────────────────────────────────────────────────────────────────────────────
// Departments API — typed wrappers over apiClient.
//
// Endpoints mirror backend/docs/api/v1/hrm.md:
//   GET    /api/v1/hrm/departments           → DepartmentListResponse (paginated)
//   GET    /api/v1/hrm/departments/{id}      → DepartmentShowResponse
//   POST   /api/v1/hrm/departments           → DepartmentShowResponse (201)
//   PATCH  /api/v1/hrm/departments/{id}      → DepartmentShowResponse
//   DELETE /api/v1/hrm/departments/{id}      → 204 No Content
//
// Same patterns as api/employees.ts — Sanctum cookie auth via the shared
// client, status codes pass through unchanged for the page/composable
// layers to map.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strip undefined and empty-string values from the params object — same
 * cleanParams guard the Employees API ships with. An empty `?search=`
 * would otherwise ILIKE-match every row.
 */
function cleanParams(params: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        if (typeof value === 'string' && value === '') continue;
        out[key] = value;
    }
    return out;
}

export async function listDepartments(
    params: DepartmentListParams = {},
): Promise<DepartmentListResponse> {
    const res = await apiClient.get<DepartmentListResponse>('/hrm/departments', {
        params: cleanParams(params as Record<string, unknown>),
    });
    return res.data;
}

export async function getDepartment(id: number): Promise<DepartmentShowResponse> {
    const res = await apiClient.get<DepartmentShowResponse>(`/hrm/departments/${id}`);
    return res.data;
}

export async function createDepartment(
    payload: CreateDepartmentRequest,
): Promise<DepartmentShowResponse> {
    const res = await apiClient.post<DepartmentShowResponse>('/hrm/departments', payload);
    return res.data;
}

export async function updateDepartment(
    id: number,
    payload: UpdateDepartmentRequest,
): Promise<DepartmentShowResponse> {
    const res = await apiClient.patch<DepartmentShowResponse>(
        `/hrm/departments/${id}`,
        payload,
    );
    return res.data;
}

export async function deleteDepartment(id: number): Promise<void> {
    await apiClient.delete(`/hrm/departments/${id}`);
}
