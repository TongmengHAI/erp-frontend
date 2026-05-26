import { z } from 'zod';

import { EMPLOYEE_STATUSES } from '@/modules/hrm/types/employee';

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema for the Employee create/edit form.
//
// Mirrors the backend's StoreEmployeeRequest / UpdateEmployeeRequest rules
// (see backend/docs/api/v1/hrm.md "Field semantics"). Client-side validation
// catches the common mistakes before submit; the backend remains the final
// authority — server-validation errors (422) flow back through the form's
// setErrors() handler per the LoginPage pattern.
//
// Notes:
//   - email and job_title are nullable on the backend; the form treats
//     empty string as "absent" and emits null on submit (the request layer
//     converts).
//   - status is a strict enum literal union so TypeScript's type narrowing
//     works at every consumer.
//   - hire_date is a YYYY-MM-DD string. PrimeVue Calendar emits a Date
//     object — the form will format it before validation runs.
// ─────────────────────────────────────────────────────────────────────────────

export const employeeFormSchema = z.object({
    employee_code: z
        .string({ required_error: 'Employee code is required.' })
        .trim()
        .min(1, 'Employee code is required.')
        .max(32, 'Employee code must be 32 characters or fewer.'),
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
    // Department FK — nullable integer, optional. The picker's "— None —"
    // option emits null; assigning a department emits the id. No
    // client-side existence check (the picker only shows valid
    // same-company departments); foreign-context ids only reach the
    // backend if the cached picker data is stale, in which case the
    // 422 → setErrors path surfaces the error inline.
    department_id: z.number().int().positive().nullable().optional(),
    // Position FK — replaces the old free-text job_title field. Same
    // shape as department_id: nullable integer, picker emits null for
    // "— None —", id for an assignment. Same load-bearing scoped-FK
    // backend guard.
    position_id: z.number().int().positive().nullable().optional(),
    // Branch FK — third optional cross-module FK alongside
    // department_id and position_id. Same shape, same load-bearing
    // scoped-FK backend guard. Purely additive — no cutover.
    branch_id: z.number().int().positive().nullable().optional(),
    hire_date: z
        .string({ required_error: 'Hire date is required.' })
        .min(1, 'Hire date is required.')
        // YYYY-MM-DD — the form converts the PrimeVue Calendar Date to this.
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Hire date must be a valid date.'),
    status: z.enum(EMPLOYEE_STATUSES as readonly [string, ...string[]], {
        required_error: 'Status is required.',
        invalid_type_error: 'Status is required.',
    }),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
