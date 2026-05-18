import { z } from 'zod';

import { DEPARTMENT_STATUSES } from '@/modules/hrm/types/department';

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema for the Department create/edit form.
//
// Mirrors the backend's StoreDepartmentRequest / UpdateDepartmentRequest
// rules. The description cap is 500 chars in three places (DB column,
// FormRequest, this schema); drift between any two means the UI accepts
// characters the API rejects.
//
// Notes:
//   - description is nullable on the backend; the form treats empty
//     string as "absent" and emits null on submit.
//   - status is a strict enum literal union.
// ─────────────────────────────────────────────────────────────────────────────

export const departmentFormSchema = z.object({
    code: z
        .string({ required_error: 'Code is required.' })
        .trim()
        .min(1, 'Code is required.')
        .max(32, 'Code must be 32 characters or fewer.'),
    name: z
        .string({ required_error: 'Name is required.' })
        .trim()
        .min(1, 'Name is required.')
        .max(255, 'Name must be 255 characters or fewer.'),
    description: z
        .union([
            z.literal(''),
            // 500-char cap matches backend (DB column + StoreDepartmentRequest).
            z.string().trim().max(500, 'Description must be 500 characters or fewer.'),
        ])
        .optional()
        .nullable(),
    status: z.enum(DEPARTMENT_STATUSES as readonly [string, ...string[]], {
        required_error: 'Status is required.',
        invalid_type_error: 'Status is required.',
    }),
});

export type DepartmentFormValues = z.infer<typeof departmentFormSchema>;
