import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema for the public AcceptInvitationPage form.
//
// Password rules mirror the backend AcceptInvitationRequest's
// Password::min(12)->mixedCase()->numbers()->symbols():
//
//   • min(12) — strong enough for first-touch credential creation
//   • mixedCase — at least one uppercase + at least one lowercase
//   • numbers — at least one digit
//   • symbols — at least one non-alphanumeric character
//
// uncompromised() is intentionally NOT mirrored — the backend omits
// it on Windows dev (cURL error 60 against api.pwnedpasswords.com,
// see AcceptInvitationRequest docblock). When the backend rule
// re-enables, this schema can ship the equivalent client-side hint
// (haveibeenpwned has a public hash-range API the SPA can call
// directly), but until then the four composition rules are the same
// on both sides.
//
// The triple-stack discipline per §10.4 — Zod here + backend rule +
// no DB layer for passwords (no CHECK constraint; the hash is the
// constraint). The Zod rule fires immediately on submit, before the
// round-trip; the backend rule is the final authority.
// ─────────────────────────────────────────────────────────────────────────────

export const acceptInvitationSchema = z.object({
    password: z
        .string()
        .min(12, { message: 'min12' })
        .regex(/[A-Z]/, { message: 'uppercase' })
        .regex(/[a-z]/, { message: 'lowercase' })
        .regex(/[0-9]/, { message: 'numbers' })
        .regex(/[^A-Za-z0-9]/, { message: 'symbols' }),
    name: z.string().min(1).max(255).optional().or(z.literal('')),
});

export type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>;
