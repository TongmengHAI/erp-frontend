// ─────────────────────────────────────────────────────────────────────────────
// Tenant types — mirror backend/docs/api/v1/super-admin.md exactly.
//
// Source of truth is the backend contract. Drift = bug. Resource shapes
// match TenantBriefResource (list) + TenantFullResource (show / store /
// update) from Session 3.
// ─────────────────────────────────────────────────────────────────────────────

import type { PaginationLinks, PaginationMeta } from '@/modules/hrm/types/employee';

export type TenantStatus = 'active' | 'suspended' | 'archived';

export const TENANT_STATUSES: readonly TenantStatus[] = Object.freeze([
    'active',
    'suspended',
    'archived',
]);

/**
 * Compact Tenant shape — list response. Drops legal_name + timestamps
 * for payload efficiency. Status is included so the list can render
 * the Active/Suspended badge inline.
 */
export interface TenantBrief extends Record<string, unknown> {
    id: number;
    slug: string;
    name: string;
    country_code: string;
    default_currency: string;
    functional_currency: string;
    timezone: string;
    status: TenantStatus;
    created_at: string;
}

/**
 * Full Tenant shape — detail / store / update response.
 */
export interface Tenant {
    id: number;
    slug: string;
    name: string;
    legal_name: string | null;
    country_code: string;
    default_currency: string;
    functional_currency: string;
    timezone: string;
    status: TenantStatus;
    /** ISO 8601 timestamp. */
    created_at: string;
    /** ISO 8601 timestamp. */
    updated_at: string;
}

/**
 * Request body for POST /api/v1/super-admin/tenants — tenant + default
 * company + initial admin user, all in one atomic transaction per
 * Q3. Backend returns 201 with the new tenant + the initial admin's
 * one-time plaintext password.
 */
export interface CreateTenantRequest {
    slug: string;
    name: string;
    legal_name?: string | null;
    country_code: string;
    default_currency: string;
    functional_currency: string;
    timezone: string;
    company: {
        slug: string;
        name: string;
        legal_name?: string | null;
    };
    initial_admin: {
        name: string;
        email: string;
    };
}

/**
 * Response body for POST /api/v1/super-admin/tenants.
 *
 * `initial_admin_password` is the LOAD-BEARING field — the plaintext
 * password generated server-side by Str::password(16), surfaced ONCE
 * in this response and NEVER persisted to logs, audit rows, or any
 * other store. The SPA displays it via InitialAdminPasswordBanner
 * with explicit copy-once messaging.
 */
export interface CreateTenantResponse {
    data: {
        tenant: Tenant;
        initial_admin: {
            id: number;
            name: string;
            email: string;
        };
        initial_admin_password: string;
    };
}

/**
 * Request body for PATCH /api/v1/super-admin/tenants/{id} — `sometimes`
 * rules; send only what changed. Status restricted to active|suspended
 * per the v1 SA UX (archived is out of scope; backend 422s).
 *
 * Initial admin fields are NOT updatable via this endpoint — they
 * exist only at tenant-creation time. The admin user updates their
 * own profile via tenant-side endpoints (future).
 */
export interface UpdateTenantRequest {
    slug?: string;
    name?: string;
    legal_name?: string | null;
    country_code?: string;
    default_currency?: string;
    functional_currency?: string;
    timezone?: string;
    status?: Extract<TenantStatus, 'active' | 'suspended'>;
}

export interface TenantListParams {
    status?: TenantStatus;
    per_page?: number;
    page?: number;
}

export interface TenantListResponse {
    data: TenantBrief[];
    meta: PaginationMeta;
    links: PaginationLinks;
}

export interface TenantShowResponse {
    data: Tenant;
}

export interface UpdateTenantResponse {
    data: Tenant;
}
