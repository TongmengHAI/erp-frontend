import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery } from '@tanstack/vue-query';

import { getRoleImpact } from '@/modules/admin/api/roles';
import { adminRoleQueryKeys } from '@/modules/admin/composables/adminRoleQueryKeys';

// ─────────────────────────────────────────────────────────────────────────────
// useRoleImpactQuery — TanStack wrapper for /admin/roles/{id}/impact.
//
// Backs the RoleUpdateWarning dialog the RoleFormPage shows before
// saving a role update with permission REMOVALS. Per the backend's
// OVER-WARN semantic (locked decision, plan Q5): the count is
// "users currently assigned this role" — NOT "users who would lose
// effective coverage after the save." Over-warn is intentional;
// under-warn is the dangerous side. See RoleImpactController + Service
// docblocks for the full rationale.
//
// enabled-gated on (id > 0 AND removedPermissions.length > 0). Empty
// removed-permissions array means there's nothing to warn about, so
// the query stays idle; the save can proceed without the warning
// dialog.
//
// staleTime: 0 — the count must be fresh at warning-display time.
// Caching across mutations would surface stale counts after a user
// is added/removed.
// ─────────────────────────────────────────────────────────────────────────────

export function useRoleImpactQuery(
    id: MaybeRefOrGetter<number>,
    removedPermissions: MaybeRefOrGetter<string[]>,
) {
    return useQuery({
        queryKey: computed(() =>
            adminRoleQueryKeys.impact(toValue(id), toValue(removedPermissions)),
        ),
        queryFn: () => getRoleImpact(toValue(id), toValue(removedPermissions)),
        staleTime: 0,
        enabled: computed(() => {
            const rid = toValue(id);
            const removed = toValue(removedPermissions);
            return Number.isFinite(rid) && rid > 0 && removed.length > 0;
        }),
    });
}
