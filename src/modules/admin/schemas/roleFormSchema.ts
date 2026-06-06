import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas for the Role create/edit form.
//
// Two SEPARATE schemas per CLAUDE.md §10.10 (reactive-schema-vs-synthetic-
// discriminator pattern). The RoleFormPage uses a reactive
// `validationSchema: computed(() => mode === 'create' ? createSchema :
// updateSchema)` so VeeValidate's setValues doesn't have to propagate a
// synthetic discriminator. Established at Phase 2A's TenantFormPage and
// HRM Settings Session 3.
//
// Mirrors the backend triple-stack (FormRequest + Action):
//   - name              : required for create, optional for update
//   - description       : optional string, up to 2000 chars
//   - permission_ids    : required array for create; optional for update;
//                         each element must be a positive integer (the
//                         backend's Rule::exists('permissions', 'id')
//                         verifies actual existence on the wire — Zod
//                         only checks the shape).
//
// System-role-name collision (e.g. 'tenant_admin'/'accountant'/'viewer')
// is rejected by the backend FormRequest's Rule::notIn — not duplicated
// in Zod because the list of reserved names is server-owned; a Zod copy
// would drift on every new system role. The 422 routes through
// VeeValidate's setErrors at submit time.
//
// Per-tenant uniqueness (e.g. "you already have a custom role named X")
// is similarly only checked server-side — Zod has no way to know which
// names exist in the tenant. The 422 lands on the `name` field.
// ─────────────────────────────────────────────────────────────────────────────

const NAME = z
    .string({ required_error: 'Role name is required.' })
    .trim()
    .min(1, 'Role name is required.')
    .max(255, 'Role name must be 255 characters or fewer.');

const DESCRIPTION = z
    .string()
    .trim()
    .max(2000, 'Description must be 2000 characters or fewer.')
    .nullable()
    .optional();

const PERMISSION_IDS = z
    .array(z.number().int().positive())
    .min(0); // empty array is allowed — a role with no permissions is a valid v1 shape

/**
 * Create-mode schema. All three fields are present; name and
 * permission_ids are required (permission_ids may be an empty array
 * but must be sent so the backend's CreateRoleRequest `present` rule
 * passes).
 */
export const createRoleSchema = z.object({
    name: NAME,
    description: DESCRIPTION,
    permission_ids: PERMISSION_IDS,
});

/**
 * Update-mode schema. All fields optional — the backend uses Laravel's
 * `sometimes` so partial updates work. The form ALWAYS sends all three
 * (the picker model is reset to the current row's permissions on
 * mount, so what the user submits is the complete intended state, not
 * a delta) — `optional` here is for the Zod type, not for the wire.
 */
export const updateRoleSchema = z.object({
    name: NAME.optional(),
    description: DESCRIPTION,
    permission_ids: PERMISSION_IDS.optional(),
});

export type CreateRoleFormValues = z.infer<typeof createRoleSchema>;
export type UpdateRoleFormValues = z.infer<typeof updateRoleSchema>;

/**
 * Form-state union type. Covers both runtime branches with permissive
 * optionality so a single useForm<RoleFormValues>() works under either
 * schema.
 */
export type RoleFormValues = {
    name?: string;
    description?: string | null;
    permission_ids?: number[];
};
