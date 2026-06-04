import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Tenant form schemas — TWO distinct Zod schemas, one per form mode.
//
// Per §10.10 (Reactive-schema-vs-synthetic-discriminator): the form
// page selects between these via `validationSchema: computed(() =>
// toTypedSchema(mode === 'create' ? tenantCreateSchema :
// tenantEditSchema))`. NOT a discriminated union on a synthetic _mode
// field — VeeValidate's setValues doesn't reliably propagate writes
// to fields never registered via useField, so the discriminator stays
// stale and the wrong validation branch keeps firing (the trap that
// surfaced in HRM Settings Session 3).
//
// Create mode requires `company` + `initial_admin` blocks; edit mode
// omits them entirely (company + admin are not editable post-create
// in v1 — see Stage 2-5 admin features in docs/admin.md).
//
// Both schemas mirror the backend StoreTenantRequest / UpdateTenantRequest
// rules EXACTLY. Drift between Zod and the FormRequest = a 422 path
// the SPA can't surface gracefully.
// ─────────────────────────────────────────────────────────────────────────────

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COUNTRY_REGEX = /^[A-Z]{2}$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;

const TENANT_PROFILE_FIELDS = {
    slug: z
        .string({ required_error: 'Slug is required.' })
        .trim()
        .min(1, 'Slug is required.')
        .max(63, 'Slug must be 63 characters or fewer.')
        .regex(SLUG_REGEX, 'Slug must be lowercase letters, digits, and hyphens (no leading/trailing hyphens).'),
    name: z
        .string({ required_error: 'Name is required.' })
        .trim()
        .min(1, 'Name is required.')
        .max(255, 'Name must be 255 characters or fewer.'),
    legal_name: z
        .union([z.literal(''), z.string().trim().max(255, 'Legal name must be 255 characters or fewer.')])
        .optional()
        .nullable(),
    country_code: z
        .string({ required_error: 'Country code is required.' })
        .trim()
        .regex(COUNTRY_REGEX, 'Country code must be 2 uppercase letters (ISO 3166-1, e.g. KH).'),
    default_currency: z
        .string({ required_error: 'Default currency is required.' })
        .trim()
        .regex(CURRENCY_REGEX, 'Currency must be 3 uppercase letters (ISO 4217, e.g. USD).'),
    functional_currency: z
        .string({ required_error: 'Functional currency is required.' })
        .trim()
        .regex(CURRENCY_REGEX, 'Currency must be 3 uppercase letters (ISO 4217, e.g. USD).'),
    timezone: z
        .string({ required_error: 'Timezone is required.' })
        .trim()
        .min(1, 'Timezone is required.')
        .max(64, 'Timezone must be 64 characters or fewer.'),
};

/**
 * Create schema — tenant profile + company block + initial admin block.
 * The two nested blocks are REQUIRED in create mode (atomic creation
 * per Q3; Session 3 backend's StoreTenantRequest enforces them).
 */
export const tenantCreateSchema = z.object({
    ...TENANT_PROFILE_FIELDS,
    company: z.object({
        slug: z
            .string({ required_error: 'Company slug is required.' })
            .trim()
            .min(1, 'Company slug is required.')
            .max(63, 'Company slug must be 63 characters or fewer.')
            .regex(SLUG_REGEX, 'Company slug must be lowercase letters, digits, and hyphens.'),
        name: z
            .string({ required_error: 'Company name is required.' })
            .trim()
            .min(1, 'Company name is required.')
            .max(255, 'Company name must be 255 characters or fewer.'),
        legal_name: z
            .union([z.literal(''), z.string().trim().max(255)])
            .optional()
            .nullable(),
    }),
    initial_admin: z.object({
        name: z
            .string({ required_error: 'Initial admin name is required.' })
            .trim()
            .min(1, 'Initial admin name is required.')
            .max(255, 'Name must be 255 characters or fewer.'),
        email: z
            .string({ required_error: 'Initial admin email is required.' })
            .trim()
            .email('Enter a valid email address.')
            .max(255),
    }),
});

/**
 * Edit schema — profile fields only + the SA-permitted status
 * transition. NO company, NO initial_admin: they're omitted entirely
 * (not present, not just optional) so Zod's strip-unknown semantics
 * keep the form state clean.
 *
 * status is restricted to active|suspended per the v1 SA UX
 * (archived is out of scope; the backend's UpdateTenantRequest 422s
 * the archived case via Rule::in).
 */
export const tenantEditSchema = z.object({
    ...TENANT_PROFILE_FIELDS,
    status: z.enum(['active', 'suspended'], {
        required_error: 'Status is required.',
        invalid_type_error: 'Status must be active or suspended.',
    }),
});

export type TenantCreateValues = z.infer<typeof tenantCreateSchema>;
export type TenantEditValues = z.infer<typeof tenantEditSchema>;
