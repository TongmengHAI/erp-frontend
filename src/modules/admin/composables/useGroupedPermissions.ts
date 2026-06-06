import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue';

import type { AdminRolePermission } from '@/modules/admin/types/role';
import type { PermissionDescriptionsResponse } from '@/modules/admin/api/permissions';

// ─────────────────────────────────────────────────────────────────────────────
// useGroupedPermissions — shared grouping + labeling logic for both
// PermissionList.vue (Session 3 — read-only display) and the future
// PermissionPicker.vue (Session 4 — interactive editor).
//
// Per the locked Phase 2B decision (Q3 + Session 3 brief), PermissionList
// and PermissionPicker are SEPARATE components — different UX intent
// (informational vs interactive), different presentation. They share
// this composable for the data shape so the grouping logic doesn't
// drift between read-only and editable surfaces.
//
// Returns a Vue computed of:
//   {
//     groups: Array<{ domainKey, domainLabel, permissions: [{id, name, label}] }>,
//     descriptionFor: (permName: string) => string,
//     domainLabelFor: (domainKey: string) => string,
//   }
//
// Grouping is by the first dotted segment of `name` ('hrm.employee.view'
// → domain 'hrm'). Domain order follows the order of first appearance
// in the input permissions array (typically the backend's sort order).
// Within each group, permissions stay in their input order.
//
// Fallback labels: when a permission or domain isn't in the descriptions
// catalog, the raw key is surfaced as the label. The PermissionDescript
// ionsEndpointTest's per-permission coverage check (backend) prevents
// this from happening for shipped permissions; the fallback exists for
// the brief window between a permission landing in the registry and
// the catalog being updated.
// ─────────────────────────────────────────────────────────────────────────────

export interface GroupedPermission {
    id: number;
    name: string;
    label: string;
}

export interface PermissionGroup {
    domainKey: string;
    domainLabel: string;
    permissions: GroupedPermission[];
}

export interface UseGroupedPermissionsReturn {
    groups: ComputedRef<PermissionGroup[]>;
    descriptionFor: (permName: string) => string;
    domainLabelFor: (domainKey: string) => string;
}

export function useGroupedPermissions(
    permissions: MaybeRefOrGetter<AdminRolePermission[]>,
    descriptions: MaybeRefOrGetter<PermissionDescriptionsResponse | undefined>,
): UseGroupedPermissionsReturn {
    const descriptionsMap = computed<Record<string, string>>(
        () => toValue(descriptions)?.data.permissions ?? {},
    );
    const domainsMap = computed<Record<string, string>>(
        () => toValue(descriptions)?.data.domains ?? {},
    );

    function domainKeyOf(permName: string): string {
        const firstDot = permName.indexOf('.');
        return firstDot === -1 ? permName : permName.slice(0, firstDot);
    }

    function descriptionFor(permName: string): string {
        return descriptionsMap.value[permName] ?? permName;
    }

    function domainLabelFor(domainKey: string): string {
        return domainsMap.value[domainKey] ?? domainKey;
    }

    const groups = computed<PermissionGroup[]>(() => {
        const input = toValue(permissions);
        if (!Array.isArray(input) || input.length === 0) return [];

        const grouped = new Map<string, GroupedPermission[]>();
        for (const perm of input) {
            const key = domainKeyOf(perm.name);
            const bucket = grouped.get(key);
            const entry: GroupedPermission = {
                id: perm.id,
                name: perm.name,
                label: descriptionFor(perm.name),
            };
            if (bucket) {
                bucket.push(entry);
            } else {
                grouped.set(key, [entry]);
            }
        }

        return Array.from(grouped.entries()).map(([domainKey, perms]) => ({
            domainKey,
            domainLabel: domainLabelFor(domainKey),
            permissions: perms,
        }));
    });

    return { groups, descriptionFor, domainLabelFor };
}
