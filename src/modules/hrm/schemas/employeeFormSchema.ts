import { z } from 'zod';

import { EMPLOYEE_STATUSES } from '@/modules/hrm/types/employee';

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas for the Employee create/edit form.
//
// Two schemas, one per tenant per-company HrmSettings state. The
// EmployeeFormPage uses a reactive `validationSchema: computed(...)` that
// picks between them based on the fetched settings — schema SELECTION is
// the load-bearing thing, not a discriminator field inside the values
// object. (An earlier attempt embedded a `_autoGen` discriminator field
// in a single discriminated union; VeeValidate's setValues did not
// reliably propagate that synthetic field, so the schema branch never
// flipped and the form kept showing "code is required" even when the
// auto-gen template was rendered. Two separate schemas avoid the entire
// class of bug.)
//
// Mirrors the backend's StoreEmployeeRequest:
//   - When auto-gen is OFF: employee_code is required (min 1, max 32).
//     `employeeFormSchemaManual` — pre-Session-3 behavior.
//   - When auto-gen is ON: employee_code is `prohibited` server-side, so
//     the form omits the field entirely from the payload AND from
//     validation. `employeeFormSchemaAutoGen` simply has no
//     employee_code key.
//
// Edit mode always uses the manual schema — the employee's existing
// employee_code stays editable regardless of the tenant flag.
// ─────────────────────────────────────────────────────────────────────────────

const baseFields = {
    full_name: z
        .string({ required_error: 'Full name is required.' })
        .trim()
        .min(1, 'Full name is required.')
        .max(255, 'Full name must be 255 characters or fewer.'),
    email: z
        .union([
            z.literal(''),
            z.string().trim().email('Enter a valid email address.').max(255),
        ])
        .optional()
        .nullable(),
    department_id: z.number().int().positive().nullable().optional(),
    position_id: z.number().int().positive().nullable().optional(),
    branch_id: z.number().int().positive().nullable().optional(),
    hire_date: z
        .string({ required_error: 'Hire date is required.' })
        .min(1, 'Hire date is required.')
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Hire date must be a valid date.'),
    status: z.enum(EMPLOYEE_STATUSES as readonly [string, ...string[]], {
        required_error: 'Status is required.',
        invalid_type_error: 'Status is required.',
    }),
};

/**
 * Auto-gen OFF (and ALL edit-mode flows). Free-input employee_code,
 * required. Pre-Session-3 behavior.
 */
export const employeeFormSchemaManual = z.object({
    employee_code: z
        .string({ required_error: 'Employee code is required.' })
        .trim()
        .min(1, 'Employee code is required.')
        .max(32, 'Employee code must be 32 characters or fewer.'),
    ...baseFields,
});

/**
 * Auto-gen ON (create-mode only). No employee_code in the schema —
 * Zod strips it from the values object on parse, and the form template
 * doesn't render an input for it. The backend's StoreEmployeeRequest
 * treats a present employee_code as `prohibited` in this mode, so the
 * payload omits the key entirely (see EmployeeFormPage.normalizePayload).
 */
export const employeeFormSchemaAutoGen = z.object({
    ...baseFields,
});

export type EmployeeFormManualValues = z.infer<typeof employeeFormSchemaManual>;
export type EmployeeFormAutoGenValues = z.infer<typeof employeeFormSchemaAutoGen>;

/**
 * Form-state type — covers both runtime branches. employee_code is
 * optional because the auto-gen schema omits it; the manual schema
 * requires it, but the form-state always carries a (possibly empty)
 * string in manual mode anyway.
 *
 * Consumers narrow against `isAutoGenMode` at the call site.
 */
export type EmployeeFormValues = EmployeeFormAutoGenValues & {
    employee_code?: string;
};

/**
 * Backwards-compat alias. Defaults to the manual variant for any callsite
 * that still imports `employeeFormSchema` directly (e.g. future unit
 * tests on the schema itself). New code should pick the right schema
 * explicitly.
 */
export const employeeFormSchema = employeeFormSchemaManual;
