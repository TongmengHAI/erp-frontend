import { z } from 'zod';

import { BALANCE_LEAVE_TYPES } from '@/modules/hrm/types/leaveBalance';

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema for the Leave Balance create/edit form. Mirrors the
// backend's StoreLeaveBalanceRequest validation rules exactly:
//
//   • employee_id     : positive int (scoped-exists enforced server-side)
//   • leave_type      : enum subset 'annual' | 'sick' (the DB CHECK +
//                       FormRequest in:rule + this enum form a three-
//                       layer discipline against drift)
//   • period_year     : int in [2000, 2100] — catches typos like 26 vs 2026
//   • allocated_days  : non-negative, multiple of 0.5, max 366
//   • notes           : optional, up to 500 chars
//
// allocated_days half-step refinement: Zod's multipleOf rule on number
// uses approximate equality (epsilon 1e-9) which works correctly for
// 0.5-step values within the [0, 366] range.
// ─────────────────────────────────────────────────────────────────────────────

export const leaveBalanceFormSchema = z.object({
    employee_id: z
        .number({ required_error: 'Employee is required.', invalid_type_error: 'Employee is required.' })
        .int('Employee is required.')
        .positive('Employee is required.'),
    leave_type: z.enum(BALANCE_LEAVE_TYPES as readonly [string, ...string[]], {
        required_error: 'Leave type is required.',
        invalid_type_error: 'Leave type must be annual or sick.',
    }),
    period_year: z
        .number({ required_error: 'Period year is required.', invalid_type_error: 'Period year is required.' })
        .int('Period year must be a whole number.')
        .min(2000, 'Period year must be 2000 or later.')
        .max(2100, 'Period year must be 2100 or earlier.'),
    allocated_days: z
        .number({ required_error: 'Allocated days is required.', invalid_type_error: 'Allocated days is required.' })
        .min(0, 'Allocated days cannot be negative.')
        .max(366, 'Allocated days cannot exceed 366.')
        .multipleOf(0.5, 'Allocated days must be in half-day steps (e.g. 7, 7.5, 14).'),
    notes: z
        .union([
            z.literal(''),
            z.string().trim().max(500, 'Notes must be 500 characters or fewer.'),
        ])
        .optional()
        .nullable(),
});

export type LeaveBalanceFormValues = z.infer<typeof leaveBalanceFormSchema>;
