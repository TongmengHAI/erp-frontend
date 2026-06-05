import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema for the InviteUserForm.
//
// Three fields:
//   • email — required, valid email shape, max 254 (matches backend
//             InviteUserRequest's email:rfc + max:254)
//   • name  — optional, max 255
//   • role_id — required, positive integer
//
// The email-uniqueness invariant (Phase 2A Q10 Option A:
// email_globally_registered) is enforced server-side and surfaced as
// 422 with errors.email + a top-level error_code. The form maps that
// 422 to VeeValidate setErrors so the field shows the message inline.
// The schema can't anticipate it (no DB access from the browser).
//
// Same shape as the backend InviteUserRequest's `rules()` — drift
// here = "UI accepts what the API rejects" or vice versa, the §10.4
// triple-stack discipline gap.
// ─────────────────────────────────────────────────────────────────────────────

export const inviteUserSchema = z.object({
    email: z.string().min(1).max(254).email(),
    name: z.string().max(255).optional().or(z.literal('')),
    role_id: z.number().int().positive(),
});

export type InviteUserFormValues = z.infer<typeof inviteUserSchema>;
