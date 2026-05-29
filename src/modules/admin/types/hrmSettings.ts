// ─────────────────────────────────────────────────────────────────────────────
// HRM Settings types — mirror backend/docs/api/v1/hrm.md
// ("Per-Company HRM Settings" section) exactly.
//
// One settings row per (tenant_id, company_id) bootstrapped by the
// CompanyCreated listener (BootstrapHrmSettingsListener). This domain
// has show + update only — never store/destroy at the API layer.
//
// The companion state table (hrm_employee_code_sequences) is NOT
// surfaced here — it's pure runtime state, no UI, no admin reads.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Employee lifecycle status used as the default for new employee
 * records. Matches the backend EmployeeStatus enum exactly:
 *   active / on_leave / terminated
 *
 * The backend's hrm_settings_default_status_check constraint and the
 * UpdateHrmSettingsRequest's `Rule::in(EmployeeStatus::cases())` both
 * pin this set; the form Select draws from DEFAULT_EMPLOYEE_STATUSES
 * below. The Employee form's status enum (hrm/types/employee.ts) is
 * the same three values — a single value moving across both forms
 * lands cleanly on either Select.
 *
 * (Note: 'terminated' is technically a nonsense choice as a *default*
 * for new employees, but the backend's allow-list is the same set as
 * EmployeeStatus; we mirror the backend to avoid drift between layers.
 * Administrative discipline keeps it from being chosen in practice.)
 */
export type DefaultEmployeeStatus = 'active' | 'on_leave' | 'terminated';

export const DEFAULT_EMPLOYEE_STATUSES: readonly DefaultEmployeeStatus[] =
    Object.freeze(['active', 'on_leave', 'terminated']);

/**
 * Full HrmSettings shape — what `show` and `update` both return.
 *
 * Cross-field invariant (mirrors the composite DB CHECK
 * `hrm_settings_autogen_prefix_consistency_check`):
 *   auto_generate_employee_code = true → employee_code_prefix MUST be set.
 *
 * The discriminated-union form lives in the Zod schema; this raw
 * shape stays flat because that's how the API serialises it.
 */
export interface HrmSettings {
    id: number;
    tenant_id: number;
    company_id: number;
    auto_generate_employee_code: boolean;
    /** Always present-or-null on the wire. The composite CHECK guarantees
     *  that null is paired with auto_generate=false. */
    employee_code_prefix: string | null;
    default_employee_status: DefaultEmployeeStatus;
    /** ISO 8601 timestamp. */
    created_at: string;
    /** ISO 8601 timestamp. */
    updated_at: string;
}

/**
 * Query parameters for GET /api/v1/admin/hrm/settings/{id}.
 *
 * `company_id` lets a multi-company admin select which company's
 * settings to read without changing their session CompanyContext.
 * Absent → backend defaults to the current company.
 */
export interface HrmSettingsShowParams {
    company_id?: number;
}

export interface HrmSettingsShowResponse {
    data: HrmSettings;
}

/**
 * Request body for PATCH /api/v1/admin/hrm/settings/{id}.
 * All fields optional — backend uses `sometimes`. The composite cross-
 * field rule fires server-side on the EFFECTIVE post-patch state
 * (FormRequest withValidator hook reads the route-bound row).
 *
 * Wire shape stays flat. The discriminated union is a FORM-state
 * concern, not a wire concern.
 */
export interface UpdateHrmSettingsRequest {
    auto_generate_employee_code?: boolean;
    employee_code_prefix?: string | null;
    default_employee_status?: DefaultEmployeeStatus;
}

export interface UpdateHrmSettingsResponse {
    data: HrmSettings;
}
