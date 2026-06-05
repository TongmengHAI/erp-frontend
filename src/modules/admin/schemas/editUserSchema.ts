import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema for EditUserPage.
//
// Phase 2A's edit scope is intentionally narrow per the backend
// UpdateUserRequest:
//   • name — optional, string, max 255
//   • role_id — optional, positive integer
//
// Both fields use `optional()` because the backend uses Laravel's
// `sometimes` — only sent fields are validated; partial updates work.
//
// Status transitions are NOT here — they go through dedicated
// /disable, /enable, /deactivate, /restore endpoints per §10.2.
// ─────────────────────────────────────────────────────────────────────────────

export const editUserSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    role_id: z.number().int().positive().optional(),
});

export type EditUserFormValues = z.infer<typeof editUserSchema>;
