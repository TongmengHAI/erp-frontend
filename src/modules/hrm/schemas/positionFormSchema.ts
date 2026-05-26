import { z } from 'zod';

import { POSITION_STATUSES } from '@/modules/hrm/types/position';

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema for the Position create/edit form. Mirror of
// departmentFormSchema — same field shapes, same nullable description
// pattern, same 500-char cap discipline (DB column + StorePositionRequest
// + this schema; drift between any two = UI accepts what API rejects).
// ─────────────────────────────────────────────────────────────────────────────

export const positionFormSchema = z.object({
    code: z
        .string({ required_error: 'Code is required.' })
        .trim()
        .min(1, 'Code is required.')
        .max(32, 'Code must be 32 characters or fewer.'),
    title: z
        .string({ required_error: 'Title is required.' })
        .trim()
        .min(1, 'Title is required.')
        .max(255, 'Title must be 255 characters or fewer.'),
    description: z
        .union([
            z.literal(''),
            z.string().trim().max(500, 'Description must be 500 characters or fewer.'),
        ])
        .optional()
        .nullable(),
    status: z.enum(POSITION_STATUSES as readonly [string, ...string[]], {
        required_error: 'Status is required.',
        invalid_type_error: 'Status is required.',
    }),
});

export type PositionFormValues = z.infer<typeof positionFormSchema>;
