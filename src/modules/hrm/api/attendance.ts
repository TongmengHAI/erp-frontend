import { apiClient } from '@/shared/api/client';

import type {
    AttendanceListParams,
    AttendanceListResponse,
    AttendanceShowResponse,
    CreateAttendanceRequest,
    UpdateAttendanceRequest,
} from '@/modules/hrm/types/attendance';

// ─────────────────────────────────────────────────────────────────────────────
// Attendance API — typed wrappers over apiClient.
//
// Endpoints mirror backend/docs/api/v1/hrm.md:
//   GET    /api/v1/hrm/attendance              → AttendanceListResponse (paginated)
//   GET    /api/v1/hrm/attendance/{id}         → AttendanceShowResponse
//   POST   /api/v1/hrm/attendance              → AttendanceShowResponse (201)
//   PATCH  /api/v1/hrm/attendance/{id}         → AttendanceShowResponse
//   DELETE /api/v1/hrm/attendance/{id}         → 204
//
// Same cleanParams + 5 CRUD wrappers as Leave Requests / Employees.
// No transition endpoints (Attendance is pure CRUD).
//
// 422 with errors.date carries the named-fields uniqueness message
// "Attendance for {employee} on {date} already exists." — the form page
// renders it inline next to the date picker.
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

export async function listAttendance(
    params: AttendanceListParams = {},
): Promise<AttendanceListResponse> {
    const res = await apiClient.get<AttendanceListResponse>('/hrm/attendance', {
        params: cleanParams(params as Record<string, unknown>),
    });
    return res.data;
}

export async function getAttendance(id: number): Promise<AttendanceShowResponse> {
    const res = await apiClient.get<AttendanceShowResponse>(`/hrm/attendance/${id}`);
    return res.data;
}

export async function createAttendance(
    payload: CreateAttendanceRequest,
): Promise<AttendanceShowResponse> {
    const res = await apiClient.post<AttendanceShowResponse>('/hrm/attendance', payload);
    return res.data;
}

export async function updateAttendance(
    id: number,
    payload: UpdateAttendanceRequest,
): Promise<AttendanceShowResponse> {
    const res = await apiClient.patch<AttendanceShowResponse>(
        `/hrm/attendance/${id}`,
        payload,
    );
    return res.data;
}

export async function deleteAttendance(id: number): Promise<void> {
    await apiClient.delete(`/hrm/attendance/${id}`);
}
