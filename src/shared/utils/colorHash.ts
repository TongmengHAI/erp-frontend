// ─────────────────────────────────────────────────────────────────────────────
// Deterministic color hash for UserAvatar initials backgrounds.
//
// Hashes an email (or name fallback) to one of 8 muted hues, distinct from the
// brand blue (220°) so user dots don't visually clash with primary UI.
//
// Per F2 master plan decision #15 (revised in F2b). These hues are utility-
// specific — not added to tokens.css because they don't form part of the
// app-wide design system.
// ─────────────────────────────────────────────────────────────────────────────

export const AVATAR_PALETTE: readonly string[] = [
    'hsl(180 35% 45%)', // teal
    'hsl(140 25% 45%)', // sage
    'hsl(80 25% 42%)', // olive
    'hsl(45 50% 45%)', // mustard
    'hsl(15 45% 50%)', // terracotta
    'hsl(345 35% 50%)', // rose
    'hsl(290 25% 45%)', // plum
    'hsl(250 20% 45%)', // slate-purple
];

/**
 * Hash a string (typically an email, with name as fallback) to a palette
 * color. djb2-style sum-of-char-codes mod palette.length. Deterministic:
 * same input always returns the same color.
 */
export function avatarColor(seed: string | undefined | null): string {
    if (!seed) return AVATAR_PALETTE[0];
    let hash = 5381;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) + hash + seed.charCodeAt(i)) >>> 0;
    }
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

/**
 * Extract up to 2 uppercase initials from a name.
 *   "Jane Bookkeeper" → "JB"
 *   "Madonna"         → "M"
 *   ""                → "?"
 */
export function initialsFromName(name: string): string {
    const tokens = name.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return '?';
    if (tokens.length === 1) return tokens[0].charAt(0).toUpperCase();
    return (tokens[0].charAt(0) + tokens[tokens.length - 1].charAt(0)).toUpperCase();
}
