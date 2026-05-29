import { z } from 'zod';

import { DEFAULT_EMPLOYEE_STATUSES } from '@/modules/admin/types/hrmSettings';

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema for the HRM Settings update form.
//
// Discriminated union on `auto_generate_employee_code`:
//   - true  → prefix REQUIRED, regex /^[A-Z0-9_-]+$/, max 8 chars
//   - false → prefix MAY be null OR a valid string (kept for display/reuse
//             after the toggle flips back off — the DB doesn't require it
//             to be cleared, and the composite CHECK only fires when
//             auto_generate=true with prefix=null)
//
// Why discriminated union (NOT `prefix: z.string().optional()`):
//   - The narrowed `true` branch lets the form template read
//     `field.value.employee_code_prefix` as a string, not string | null.
//   - The cross-field consistency rule (auto-gen ON ⇒ prefix required)
//     becomes a TYPE-LEVEL invariant — TypeScript catches a submit
//     payload that violates it at compile time. The plan called this
//     out as the load-bearing reason for the union shape.
//   - Stage 2-5 admin features will consume this same narrowing pattern;
//     setting the precedent now keeps later schemas consistent.
//
// Alphabet rule on prefix mirrors the backend's StoreHrmSettingsRequest
// regex AND the DB CHECK `hrm_settings_prefix_alphabet_check`. Drift
// between any two layers = the triple-stack discipline failing.
//
// `default_employee_status` is a plain enum; not part of the union.
// ─────────────────────────────────────────────────────────────────────────────

const PREFIX_ALPHABET = /^[A-Z0-9_-]+$/;
const PREFIX_MAX_LENGTH = 8;

const prefixWhenOn = z
    .string({ required_error: 'Prefix is required when auto-generate is on.' })
    .trim()
    .min(1, 'Prefix is required when auto-generate is on.')
    .max(PREFIX_MAX_LENGTH, `Prefix must be ${PREFIX_MAX_LENGTH} characters or fewer.`)
    .regex(
        PREFIX_ALPHABET,
        'Prefix must be uppercase letters, digits, underscore, or hyphen only.',
    );

/**
 * When auto-gen is OFF, the field MAY hold:
 *   - null (cleared / never set)
 *   - empty string (form-state default after a user clears it)
 *   - a valid prefix (preserved from a prior ON state so toggling back
 *     ON pre-fills with the previous value rather than re-prompting)
 *
 * The empty-string union is the ergonomic escape hatch a plain
 * `.nullable()` doesn't give VeeValidate, which models empty inputs as
 * `''` rather than `null` until the user moves on.
 */
const prefixWhenOff = z
    .union([
        z.literal(null),
        z.literal(''),
        z
            .string()
            .trim()
            .min(1)
            .max(PREFIX_MAX_LENGTH, `Prefix must be ${PREFIX_MAX_LENGTH} characters or fewer.`)
            .regex(
                PREFIX_ALPHABET,
                'Prefix must be uppercase letters, digits, underscore, or hyphen only.',
            ),
    ])
    .optional();

export const hrmSettingsFormSchema = z.discriminatedUnion(
    'auto_generate_employee_code',
    [
        z.object({
            auto_generate_employee_code: z.literal(true),
            employee_code_prefix: prefixWhenOn,
            default_employee_status: z.enum(
                DEFAULT_EMPLOYEE_STATUSES as readonly [string, ...string[]],
                {
                    required_error: 'Default status is required.',
                    invalid_type_error: 'Default status is required.',
                },
            ),
        }),
        z.object({
            auto_generate_employee_code: z.literal(false),
            employee_code_prefix: prefixWhenOff,
            default_employee_status: z.enum(
                DEFAULT_EMPLOYEE_STATUSES as readonly [string, ...string[]],
                {
                    required_error: 'Default status is required.',
                    invalid_type_error: 'Default status is required.',
                },
            ),
        }),
    ],
);

export type HrmSettingsFormValues = z.infer<typeof hrmSettingsFormSchema>;
