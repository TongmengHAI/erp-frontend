import { describe, expect, it } from 'vitest';

import {
    tenantCreateSchema,
    tenantEditSchema,
} from '@/modules/super-admin/schemas/tenantFormSchema';

// ─────────────────────────────────────────────────────────────────────────────
// Two-mode form schema test (Session 6 plan tightening #1). Per §10.10
// the two modes use two distinct schemas, picked by the page's
// computed validationSchema. This test pins:
//
//   • Create REQUIRES initial_admin name + email (and the company block)
//   • Edit OMITS those fields entirely (strip-unknown semantics)
//   • Switching from one schema to the other yields different errors
// ─────────────────────────────────────────────────────────────────────────────

const VALID_PROFILE = {
    slug: 'acme-trading',
    name: 'Acme Trading Co.',
    legal_name: 'Acme Trading Co., Ltd.',
    country_code: 'KH',
    default_currency: 'USD',
    functional_currency: 'USD',
    timezone: 'Asia/Phnom_Penh',
};

const VALID_COMPANY = {
    slug: 'acme-trading-main',
    name: 'Acme Trading Main',
    legal_name: 'Acme Trading Co., Ltd.',
};

const VALID_ADMIN = {
    name: 'Sokha Chan',
    email: 'sokha@acme.kh',
};

describe('tenantCreateSchema', () => {
    it('requires the initial_admin block (name + email)', () => {
        const result = tenantCreateSchema.safeParse({
            ...VALID_PROFILE,
            company: VALID_COMPANY,
            // no initial_admin
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            const paths = result.error.issues.map((i) => i.path.join('.'));
            expect(paths).toContain('initial_admin');
        }
    });

    it('requires the company block', () => {
        const result = tenantCreateSchema.safeParse({
            ...VALID_PROFILE,
            initial_admin: VALID_ADMIN,
            // no company
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            const paths = result.error.issues.map((i) => i.path.join('.'));
            expect(paths).toContain('company');
        }
    });

    it('accepts a full create payload', () => {
        const result = tenantCreateSchema.safeParse({
            ...VALID_PROFILE,
            company: VALID_COMPANY,
            initial_admin: VALID_ADMIN,
        });
        expect(result.success).toBe(true);
    });

    it('validates the slug regex (lowercase + hyphens only)', () => {
        const result = tenantCreateSchema.safeParse({
            ...VALID_PROFILE,
            slug: 'Acme_Trading', // uppercase + underscore
            company: VALID_COMPANY,
            initial_admin: VALID_ADMIN,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            const paths = result.error.issues.map((i) => i.path.join('.'));
            expect(paths).toContain('slug');
        }
    });

    it('validates the initial admin email format', () => {
        const result = tenantCreateSchema.safeParse({
            ...VALID_PROFILE,
            company: VALID_COMPANY,
            initial_admin: { name: 'Sokha', email: 'not-an-email' },
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            const paths = result.error.issues.map((i) => i.path.join('.'));
            expect(paths.some((p) => p.startsWith('initial_admin.email'))).toBe(true);
        }
    });
});

describe('tenantEditSchema', () => {
    it('omits initial_admin entirely — strip-unknown semantics', () => {
        const result = tenantEditSchema.safeParse({
            ...VALID_PROFILE,
            status: 'active',
            // Even if the caller sends initial_admin, Zod strips it.
            initial_admin: VALID_ADMIN,
        });
        expect(result.success).toBe(true);
        if (result.success) {
            // The parsed value does NOT include initial_admin.
            expect('initial_admin' in result.data).toBe(false);
            // And does NOT include company.
            expect('company' in result.data).toBe(false);
        }
    });

    it('requires status (active or suspended)', () => {
        const result = tenantEditSchema.safeParse({
            ...VALID_PROFILE,
            // no status
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            const paths = result.error.issues.map((i) => i.path.join('.'));
            expect(paths).toContain('status');
        }
    });

    it('rejects status=archived (out of scope for v1 SA UX)', () => {
        const result = tenantEditSchema.safeParse({
            ...VALID_PROFILE,
            status: 'archived',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            const paths = result.error.issues.map((i) => i.path.join('.'));
            expect(paths).toContain('status');
        }
    });

    it('accepts the active status', () => {
        const result = tenantEditSchema.safeParse({
            ...VALID_PROFILE,
            status: 'active',
        });
        expect(result.success).toBe(true);
    });

    it('accepts the suspended status', () => {
        const result = tenantEditSchema.safeParse({
            ...VALID_PROFILE,
            status: 'suspended',
        });
        expect(result.success).toBe(true);
    });
});

describe('two-mode contrast', () => {
    it('the SAME payload that PASSES edit FAILS create (initial_admin missing)', () => {
        // The exact scenario the page transition exercises: edit-mode
        // payload would 422 against create-mode schema because the
        // required nested blocks aren't present.
        const editPayload = { ...VALID_PROFILE, status: 'active' };

        const editResult = tenantEditSchema.safeParse(editPayload);
        expect(editResult.success).toBe(true);

        const createResult = tenantCreateSchema.safeParse(editPayload);
        expect(createResult.success).toBe(false);
    });
});
