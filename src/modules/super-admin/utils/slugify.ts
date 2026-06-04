// ─────────────────────────────────────────────────────────────────────────────
// slugify — generate a URL-safe kebab-case slug from a human name.
//
// Mirrors the backend StoreTenantRequest's slug regex EXACTLY:
//   /^[a-z0-9]+(?:-[a-z0-9]+)*$/   (max 63 chars; DNS subdomain limit)
//
// Algorithm:
//   1. Lowercase the input.
//   2. Strip diacritics via NFKD normalization (so "Sokha Trading Co.™" →
//      "sokha trading co." after a quick punctuation pass).
//   3. Replace anything that is NOT [a-z0-9] with a hyphen.
//   4. Collapse consecutive hyphens.
//   5. Trim leading/trailing hyphens.
//   6. Truncate to 63 chars (with a smart trim at the last hyphen to
//      avoid a partial trailing word).
//
// Empty / whitespace-only input → empty string. The form's Zod schema
// catches "" with a required-field message; this util is a pure
// transform, not a validator.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_LENGTH = 63;

export function slugify(input: string): string {
    if (typeof input !== 'string') return '';

    const normalized = input
        .normalize('NFKD')
        // Strip combining marks (the dot of á̄, the tilde of ñ, etc.).
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();

    let slug = normalized
        // Anything not in the alphabet collapses to a hyphen.
        .replace(/[^a-z0-9]+/g, '-')
        // De-dupe (defensive — the previous replace shouldn't produce '--' on
        // single-char punctuation runs, but Unicode is full of surprises).
        .replace(/-+/g, '-')
        // Trim leading/trailing hyphens.
        .replace(/^-|-$/g, '');

    if (slug.length <= MAX_LENGTH) return slug;

    // Smart truncation — cut at the last hyphen before MAX_LENGTH so we
    // don't leave a half-word at the end. Fall back to a hard cut if
    // there's no hyphen.
    const cut = slug.slice(0, MAX_LENGTH);
    const lastHyphen = cut.lastIndexOf('-');
    slug = lastHyphen > 0 ? cut.slice(0, lastHyphen) : cut;

    return slug;
}
