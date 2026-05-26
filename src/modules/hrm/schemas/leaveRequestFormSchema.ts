import { z } from 'zod';

import { DAY_PARTS, LEAVE_TYPES } from '@/modules/hrm/types/leaveRequest';

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema for the Leave Request create/edit form.
//
// Mirrors the backend's StoreLeaveRequestRequest / UpdateLeaveRequestRequest:
//   - employee_id is required (a real same-tenant, same-company employee)
//   - leave_type is enum
//   - start_date, end_date are required YYYY-MM-DD strings
//   - end_date >= start_date — checked via .refine
//   - reason optional, max 500
//
// status and approval columns are NOT in the schema. Even if a future
// careless callsite passes them, the type system catches it (the form
// values type is z.infer<schema>, which doesn't have those keys), and
// the FormPage's normalizePayload returns a plain CreateLeaveRequestRequest
// which also doesn't model them.
// ─────────────────────────────────────────────────────────────────────────────

export const leaveRequestFormSchema = z
    .object({
        employee_id: z
            .number({
                required_error: 'Employee is required.',
                invalid_type_error: 'Employee is required.',
            })
            .int()
            .positive('Employee is required.'),
        leave_type: z.enum(LEAVE_TYPES as readonly [string, ...string[]], {
            required_error: 'Leave type is required.',
            invalid_type_error: 'Leave type is required.',
        }),
        start_date: z
            .string({ required_error: 'Start date is required.' })
            .min(1, 'Start date is required.')
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be a valid date.'),
        end_date: z
            .string({ required_error: 'End date is required.' })
            .min(1, 'End date is required.')
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be a valid date.'),
        day_part: z.enum(DAY_PARTS as readonly [string, ...string[]], {
            required_error: 'Day part is required.',
            invalid_type_error: 'Day part is required.',
        }),
        reason: z
            .union([z.literal(''), z.string().trim().max(500, 'Reason must be 500 characters or fewer.')])
            .optional()
            .nullable(),
    })
    .refine(
        // String comparison works because the format is fixed YYYY-MM-DD
        // (lexicographic order === chronological order). No need to parse
        // into Date objects, which would re-introduce the local-vs-UTC trap
        // the dateConversion util documents.
        (vals) => vals.end_date >= vals.start_date,
        {
            message: 'End date must be on or after the start date.',
            path: ['end_date'],
        },
    )
    .refine(
        // Half-day single-date invariant — mirror of the backend
        // FormRequest closure rule. Surfaces on end_date so the user
        // sees the inline error next to the field they (might) edit.
        // For the half-day FormPage variant this rule never actually
        // fires because end_date is auto-synced to start_date — the
        // schema check is defense in depth in case a future page
        // bypasses the snap-before-hide logic.
        (vals) => vals.day_part === 'full_day' || vals.start_date === vals.end_date,
        {
            message: 'A half-day request must start and end on the same date.',
            path: ['end_date'],
        },
    );

export type LeaveRequestFormValues = z.infer<typeof leaveRequestFormSchema>;
