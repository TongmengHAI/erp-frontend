import { z } from 'zod';

import { ATTENDANCE_STATUSES } from '@/modules/hrm/types/attendance';

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema for the Attendance create/edit form.
//
// Mirrors the backend's StoreAttendanceRequest / UpdateAttendanceRequest:
//   - employee_id required positive integer
//   - date required YYYY-MM-DD
//   - clock_in / clock_out optional HH:MM:SS strings (nullable)
//   - status required enum
//   - notes optional, max 500
//
// Two cross-field refinements — both mirror backend FormRequest after()
// closures, per the triple-stack discipline (Zod → FormRequest → DB):
//   1. clock_out >= clock_in when BOTH set (otherwise the picker
//      lets a user enter 18:00 in and 09:00 out without complaint
//      until the API round-trips, which is bad UX).
//   2. The uniqueness check (employee_id, date) is NOT in this schema
//      — it requires a DB lookup. The backend's after() closure plus
//      the partial unique index handle it, and the form's setErrors
//      pattern surfaces the 422 inline on the date field.
//
// Time regex is the bounded variant:
//   ^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$
// matching what timeConversion.ts emits AND what the backend's
// StoreAttendanceRequest regex accepts. NOT the permissive
// ^\d{2}:\d{2}:\d{2}$ which would accept 99:99:99 — pinned by
// timeConversion.spec.ts's load-bearing case.
// ─────────────────────────────────────────────────────────────────────────────

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

export const attendanceFormSchema = z
    .object({
        employee_id: z
            .number({
                required_error: 'Employee is required.',
                invalid_type_error: 'Employee is required.',
            })
            .int()
            .positive('Employee is required.'),
        date: z
            .string({ required_error: 'Date is required.' })
            .min(1, 'Date is required.')
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be a valid date.'),
        clock_in: z
            .union([z.literal(''), z.string().regex(TIME_REGEX, 'Clock in must be a valid time.')])
            .optional()
            .nullable(),
        clock_out: z
            .union([z.literal(''), z.string().regex(TIME_REGEX, 'Clock out must be a valid time.')])
            .optional()
            .nullable(),
        status: z.enum(ATTENDANCE_STATUSES as readonly [string, ...string[]], {
            required_error: 'Status is required.',
            invalid_type_error: 'Status is required.',
        }),
        notes: z
            .union([z.literal(''), z.string().trim().max(500, 'Notes must be 500 characters or fewer.')])
            .optional()
            .nullable(),
    })
    .refine(
        // Clock-order: when BOTH clock_in and clock_out are non-empty,
        // clock_out >= clock_in. String comparison works because the
        // format is fixed HH:MM:SS (lexicographic === chronological
        // within a single day).
        //
        // Mirror of the backend FormRequest's after() closure — frontend
        // rejects locally before the API round-trip, backend rejects again
        // (defense in depth), DB CHECK is the final backstop.
        (vals) => {
            const inT = vals.clock_in ?? '';
            const outT = vals.clock_out ?? '';
            if (!inT || !outT) return true;
            return outT >= inT;
        },
        {
            message: 'Clock out must be on or after clock in.',
            path: ['clock_out'],
        },
    );

export type AttendanceFormValues = z.infer<typeof attendanceFormSchema>;
