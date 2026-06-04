import type { TenantBrief } from '@/modules/super-admin/types/tenant';

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard response — mirrors backend DashboardResource (Session 4).
//
// 5 metric blocks + 2 recent-activity lists + window_days. Per the
// backend docblock the window_days field is exposed so SPA copy doesn't
// hardcode the window.
// ─────────────────────────────────────────────────────────────────────────────

export interface TenantStatusCounts {
    total: number;
    active: number;
    suspended: number;
    archived: number;
}

export interface ModuleEntitlementCounts {
    module_key: string;
    active_count: number;
    disabled_count: number;
}

export interface DashboardData {
    tenant_status_counts: TenantStatusCounts;
    tenants_by_module: ModuleEntitlementCounts[];
    recent_signups: TenantBrief[];
    recent_suspensions: TenantBrief[];
    window_days: number;
}

export interface DashboardResponse {
    data: DashboardData;
}
