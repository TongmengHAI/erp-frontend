<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import { usePermissionDescriptionsQuery } from '@/modules/admin/composables/useAdminRoles';
import { useGroupedPermissions } from '@/modules/admin/composables/useGroupedPermissions';
import type { AdminRolePermission } from '@/modules/admin/types/role';

// ─────────────────────────────────────────────────────────────────────────────
// PermissionList — READ-ONLY, grouped permission display.
//
// Per the Phase 2B locked decision (Q3 + Session 3 brief), this is a
// SEPARATE component from the future PermissionPicker (Session 4):
//   • Different UX intent — INFORMATIONAL vs INTERACTIVE.
//   • Different presentation — no checkboxes, no tristate, no
//     mutation. Read-only domain groups with human-readable labels.
//   • Disabled-checkbox UI would communicate "you could toggle this
//     but it's locked" — wrong message for a system role detail page
//     where the permissions are intrinsic, not "currently disabled".
//
// Shared logic with PermissionPicker (Session 4) lives in the
// useGroupedPermissions composable — the grouping by domain + label
// resolution from the descriptions catalog stay in one place, so the
// two presentations can't drift on data shape.
//
// Usage:
//   <PermissionList :permissions="role.permissions ?? []" />
//
// The component fetches the permission descriptions catalog itself via
// usePermissionDescriptionsQuery (cached with staleTime: Infinity, so
// re-mounting the component within a session is cheap). The catalog
// is small (a few KB) and authenticated-user-readable.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    permissions: AdminRolePermission[];
}
const props = defineProps<Props>();

const { t } = useI18n();
const { data: descriptionsData } = usePermissionDescriptionsQuery();

const { groups } = useGroupedPermissions(
    () => props.permissions,
    () => descriptionsData.value,
);
</script>

<template>
    <div data-testid="permission-list">
        <p
            v-if="groups.length === 0"
            class="text-sm text-text-tertiary"
            data-testid="permission-list-empty"
        >
            {{ t('admin.roles.permissions.empty') }}
        </p>

        <div
            v-else
            class="space-y-6"
        >
            <section
                v-for="group in groups"
                :key="group.domainKey"
                :data-testid="`permission-list-group-${group.domainKey}`"
                class="border-b border-border-subtle last:border-b-0 pb-4 last:pb-0"
            >
                <h3
                    class="text-sm font-semibold text-text-primary mb-2"
                    :data-testid="`permission-list-group-label-${group.domainKey}`"
                >
                    {{ group.domainLabel }}
                </h3>
                <ul class="space-y-1">
                    <li
                        v-for="perm in group.permissions"
                        :key="perm.id"
                        :data-testid="`permission-list-item-${perm.id}`"
                        class="flex items-baseline gap-2"
                    >
                        <i class="pi pi-check text-success text-xs" />
                        <span class="text-sm text-text-secondary">{{ perm.label }}</span>
                    </li>
                </ul>
            </section>
        </div>
    </div>
</template>
