import { apiClient } from '@/shared/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// Permission descriptions API — single endpoint, two-map response.
//
// Mirrors backend Phase 2B Session 1:
//   GET /api/v1/permissions/descriptions → PermissionDescriptionsResponse
//
// Authenticated users only; no specific permission gate. Descriptions
// are static per deploy + locale, so the SPA caches with staleTime:
// Infinity (see usePermissionDescriptions composable).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Response shape:
 *
 *   data.domains.{key}      = "Display label"
 *   data.permissions.{name} = "Display label"
 *
 * Domain keys are the first segment of permission names ('hrm',
 * 'settings', 'users', 'roles', ...). Permission name keys are the
 * full dotted path ('hrm.employee.view', ...).
 */
export interface PermissionDescriptionsResponse {
    data: {
        domains: Record<string, string>;
        permissions: Record<string, string>;
    };
}

export async function getPermissionDescriptions(): Promise<PermissionDescriptionsResponse> {
    const res = await apiClient.get<PermissionDescriptionsResponse>(
        '/permissions/descriptions',
    );
    return res.data;
}
