// ─────────────────────────────────────────────────────────────────────────────
// Auth module types — mirror backend/docs/api/v1/auth.md exactly.
//
// Source of truth is the backend contract. Any drift here is a bug — if a
// field shape changes upstream, update both this file and the consuming
// callsites in a single slice.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Identity discriminator (Session 1 of the SA Portal slice). Mirrors
 * the backend `users.type` enum:
 *
 *   tenant_user — normal user belonging to a tenant. Participates in
 *                 tenant + company resolution. The vast majority of
 *                 users.
 *   super_admin — vendor-side platform operator. No tenant/company FKs;
 *                 bypasses tenant + company resolution AND module
 *                 entitlement enforcement.
 */
export type AuthUserType = 'tenant_user' | 'super_admin';

export interface AuthUser {
    /** Stable user identifier (int). */
    id: number;
    name: string;
    email: string;
    /** ISO 8601 string or null. */
    email_verified_at: string | null;
    /** Identity discriminator — see AuthUserType. */
    type: AuthUserType;
    /**
     * Convenience derived flag — `type === 'super_admin'`. The backend
     * returns it pre-computed so every consumer (auth store getter,
     * route guards, navigation, layout selection) reads from one
     * source of truth and never re-checks the string discriminator.
     */
    is_super_admin: boolean;
}

export interface AuthTenant {
    id: number;
    /** URL-safe short identifier (≤63 chars). */
    slug: string;
    name: string;
    /** ISO 3166-1 alpha-2. Business context (fiscal calendar, NBC rates). */
    country_code: string;
    /** ISO 4217 — display currency preference. */
    default_currency: string;
    /**
     * ISO 4217 — the tenant's books currency. Always use this for monetary
     * `Intl.NumberFormat`, NOT default_currency.
     */
    functional_currency: string;
    /** IANA timezone string. */
    timezone: string;
}

/**
 * Company status enum mirroring backend `CompanyStatus`. Only active
 * companies appear in `companies[]`; archived companies are filtered
 * server-side. `current_company.status` is always 'active' too (the
 * resolution chain only pins active companies).
 */
export type AuthCompanyStatus = 'active' | 'archived';

/**
 * Full Company shape — returned as `data.current_company` in /auth/me.
 * Mirrors AuthTenant's shape plus a status. The SPA uses these fields
 * for chrome (currency-formatting defaults, timezone-aware date display).
 */
export interface AuthCompany {
    id: number;
    slug: string;
    name: string;
    country_code: string;
    default_currency: string;
    functional_currency: string;
    timezone: string;
    status: AuthCompanyStatus;
}

/**
 * Compact Company shape — entries in `data.companies[]`. Used by the
 * company picker UI (deferred) when the current_company is null.
 */
export interface AuthCompanyBrief {
    id: number;
    slug: string;
    name: string;
    status: AuthCompanyStatus;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    data: {
        user: AuthUser;
        tenant: AuthTenant;
    };
}

export interface AuthMeResponse {
    data: {
        user: AuthUser;
        /**
         * The resolved tenant. NULL for super_admin (SA has no tenant
         * context by composite DB CHECK; SA reads cross-tenant via the
         * five user-type bypass sites).
         */
        tenant: AuthTenant | null;
        /**
         * The resolved company for this request. May be null when the route
         * is `company:optional` AND no company resolves (e.g. multi-company
         * tenant where the user hasn't picked yet). Always null for SA.
         */
        current_company: AuthCompany | null;
        /**
         * All active companies in the user's tenant. Drives the company
         * picker UI (deferred) when `current_company` is null. Always
         * present; empty array for SA.
         */
        companies: AuthCompanyBrief[];
        /**
         * Role names assigned in the current tenant. Display-only. NEVER
         * branch UI on role names — only on permissions. Empty array for
         * SA (SA gates by user-type, not roles).
         */
        roles: string[];
        /** Flat list of permission names; drives can() / canAny(). Empty
         *  array for SA. */
        permissions: string[];
        /**
         * Active module entitlements for this tenant (Session 2 of the
         * SA Portal slice). Drives the launcher's per-tenant filter:
         * apps whose registry id appears in this array are visible to
         * the user; absent ones are hidden. Backend source of truth is
         * tenant_modules where status='active' AND deleted_at IS NULL.
         *
         * Empty array for SA — the SA's launcher view is driven by
         * the orthogonal `superAdminOnly` LAUNCHER_APPS field, not by
         * this array.
         */
        entitled_modules: string[];
    };
}

/**
 * Open-ended error_code union. Only `tenant_inactive` is currently
 * specified; future slices append more.
 */
export type AuthErrorCode = 'tenant_inactive' | (string & Record<never, never>);

export interface ApiErrorBody {
    message: string;
    error_code?: AuthErrorCode;
    /** 422 shape — field → array of error messages. */
    errors?: Record<string, string[]>;
}
