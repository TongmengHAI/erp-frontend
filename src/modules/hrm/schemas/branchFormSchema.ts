import { z } from 'zod';

import { BRANCH_STATUSES } from '@/modules/hrm/types/branch';

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema for the Branch create/edit form. Mirror of
// positionFormSchema's core shape, extended with the four location
// fields Branch adds over Position: address, city, country_code, phone.
//
// country_code mirrors the backend FormRequest regex /^[A-Z]{2}$/
// EXACTLY. Drift between this regex and the backend regex means the UI
// could either reject inputs the backend would accept or silently submit
// inputs the backend will 422 on. Both are bad. Keep these in sync.
//
// Length caps match the backend column definitions + StoreBranchRequest:
//   - code: 32, name: 255, description/address: 500, city: 100, phone: 32.
// ─────────────────────────────────────────────────────────────────────────────

export const branchFormSchema = z.object({
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
            z.string().trim().max(500, 'Description must be 500 characters or fewer.'),
        ])
        .optional()
        .nullable(),
    address: z
        .union([
            z.literal(''),
            z.string().trim().max(500, 'Address must be 500 characters or fewer.'),
        ])
        .optional()
        .nullable(),
    city: z
        .union([
            z.literal(''),
            z.string().trim().max(100, 'City must be 100 characters or fewer.'),
        ])
        .optional()
        .nullable(),
    country_code: z
        .union([
            z.literal(''),
            z
                .string()
                .trim()
                .regex(
                    /^[A-Z]{2}$/,
                    'Country code must be 2 uppercase letters (ISO 3166-1, e.g. KH).',
                ),
        ])
        .optional()
        .nullable(),
    phone: z
        .union([
            z.literal(''),
            z.string().trim().max(32, 'Phone must be 32 characters or fewer.'),
        ])
        .optional()
        .nullable(),
    status: z.enum(BRANCH_STATUSES as readonly [string, ...string[]], {
        required_error: 'Status is required.',
        invalid_type_error: 'Status is required.',
    }),
});

export type BranchFormValues = z.infer<typeof branchFormSchema>;
