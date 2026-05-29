import { apiClient } from '@/shared/api/client';

import type {
    HrmSettingsShowParams,
    HrmSettingsShowResponse,
    UpdateHrmSettingsRequest,
    UpdateHrmSettingsResponse,
} from '@/modules/admin/types/hrmSettings';

// ─────────────────────────────────────────────────────────────────────────────
// HRM Settings API — typed wrappers over apiClient.
//
// Endpoints (backend/docs/api/v1/hrm.md — Per-Company HRM Settings):
//   GET   /api/v1/admin/hrm/settings?company_id=X  → HrmSettingsShowResponse
//   PATCH /api/v1/admin/hrm/settings/{id}          → UpdateHrmSettingsResponse
//
// Show is a singleton endpoint — `id` is NOT in the path; the backend
// resolves the row from `?company_id=` (or current company when absent).
// The returned `data.id` is what gets passed to update().
//
// No list / store / destroy at the admin layer — the row is
// bootstrapped server-side per company by CompanyCreated listener.
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

export async function getHrmSettings(
    params: HrmSettingsShowParams = {},
): Promise<HrmSettingsShowResponse> {
    const res = await apiClient.get<HrmSettingsShowResponse>('/admin/hrm/settings', {
        params: cleanParams(params as Record<string, unknown>),
    });
    return res.data;
}

export async function updateHrmSettings(
    id: number,
    payload: UpdateHrmSettingsRequest,
): Promise<UpdateHrmSettingsResponse> {
    const res = await apiClient.patch<UpdateHrmSettingsResponse>(
        `/admin/hrm/settings/${id}`,
        payload,
    );
    return res.data;
}
