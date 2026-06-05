import { z } from 'zod';

import {
    USER_LIFECYCLE_FILTERS,
    USER_STATUSES,
} from '@/modules/admin/types/user';

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema for the admin user-list filter set.
//
// Two distinct things this schema covers:
//
//   1. The status enum — exact subset of UserStatus, used by the URL
//      enum filter chip. The frozen USER_STATUSES allowlist is the
//      runtime defence (per §10.8); this schema is the type-level
//      mirror.
//   2. The composite "lifecycle" filter that adds 'deactivated' as a
//      pseudo-status. The list page surfaces this as a single chip
//      and translates 'deactivated' into `include_deactivated=true`
//      at the wire layer.
//
// The cast to writable tuple is required because Zod's z.enum needs a
// non-readonly tuple and our exported constants are frozen + readonly
// (the frozen-ness is the runtime defence per §10.8; the type-level
// recovery is local to this file).
// ─────────────────────────────────────────────────────────────────────────────

const userStatusValues = [...USER_STATUSES] as [string, ...string[]];
const userLifecycleValues = [...USER_LIFECYCLE_FILTERS] as [string, ...string[]];

export const userStatusEnum = z.enum(userStatusValues);
export const userLifecycleEnum = z.enum(userLifecycleValues);

export const userListFiltersSchema = z.object({
    lifecycle: userLifecycleEnum.nullable().optional(),
    search: z.string().max(255).nullable().optional(),
    role_id: z.number().int().positive().nullable().optional(),
    per_page: z.number().int().min(1).max(100).nullable().optional(),
});

export type UserListFilters = z.infer<typeof userListFiltersSchema>;
