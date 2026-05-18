import { apiClient } from '@/shared/api/client';

import type {
    CreateEmployeeRequest,
    EmployeeListParams,
    EmployeeListResponse,
    EmployeeShowResponse,
    UpdateEmployeeRequest,
} from '@/modules/hrm/types/employee';

// ─────────────────────────────────────────────────────────────────────────────
// Employees API — typed wrappers over apiClient.
//
// Endpoints mirror backend/docs/api/v1/hrm.md:
//   GET    /api/v1/hrm/employees           → EmployeeListResponse (paginated)
//   GET    /api/v1/hrm/employees/{id}      → EmployeeShowResponse
//   POST   /api/v1/hrm/employees           → EmployeeShowResponse (201)
//   PATCH  /api/v1/hrm/employees/{id}      → EmployeeShowResponse
//   DELETE /api/v1/hrm/employees/{id}      → 204 No Content
//
// All requests rely on the shared apiClient's Sanctum cookie auth +
// CSRF prefetch. 401 / 403 / 404 / 422 / 429 pass through unchanged — page
// and composable layers handle them.
//
// Query-parameter discipline: undefined / empty-string values are stripped
// before serialisation. Sending ?search= (empty) would otherwise survive
// the ILIKE wildcard match and silently return zero results on the backend.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strip undefined and empty-string values from the params object. The
 * backend's `?status=` (empty) would otherwise fail validation; `?search=`
 * (empty) would match against `%%` and surface every row falsely as "a
 * match". Both behaviors are wrong, so we never send the empty value.
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

export async function listEmployees(
    params: EmployeeListParams = {},
): Promise<EmployeeListResponse> {
    const res = await apiClient.get<EmployeeListResponse>('/hrm/employees', {
        params: cleanParams(params as Record<string, unknown>),
    });
    return res.data;
}

export async function getEmployee(id: number): Promise<EmployeeShowResponse> {
    const res = await apiClient.get<EmployeeShowResponse>(`/hrm/employees/${id}`);
    return res.data;
}

export async function createEmployee(
    payload: CreateEmployeeRequest,
): Promise<EmployeeShowResponse> {
    const res = await apiClient.post<EmployeeShowResponse>('/hrm/employees', payload);
    return res.data;
}

export async function updateEmployee(
    id: number,
    payload: UpdateEmployeeRequest,
): Promise<EmployeeShowResponse> {
    const res = await apiClient.patch<EmployeeShowResponse>(`/hrm/employees/${id}`, payload);
    return res.data;
}

export async function deleteEmployee(id: number): Promise<void> {
    await apiClient.delete(`/hrm/employees/${id}`);
}
