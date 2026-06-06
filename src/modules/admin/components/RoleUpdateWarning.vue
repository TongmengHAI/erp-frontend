<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

import { useRoleImpactQuery } from '@/modules/admin/composables/useRoleImpact';

// ─────────────────────────────────────────────────────────────────────────────
// RoleUpdateWarning — pre-save warning dialog for permission removals.
//
// The RoleFormPage opens this dialog ONLY when the user's submit would
// remove at least one permission from the role. The dialog reads the
// impact endpoint to show:
//   - affected_users_count (with i18n pluralization)
//   - affected_users_preview (up to 5 names, sorted by name)
//
// Per the OVER-WARN semantic locked decision (plan Q5): the count is
// "users currently assigned this role" — not "users who would lose
// effective coverage." See backend RoleImpactController docblock for
// the full rationale. Don't "fix" this client-side.
//
// Acceptance returns control to the parent via emit('accept'); cancel
// emits 'cancel'. The dialog itself doesn't perform the mutation —
// that's the parent's job (the parent's submit handler already has
// the form values).
//
// v-model on `open` (boolean). Parent controls open/close so the page
// can open the dialog conditionally based on the permission diff.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    roleId: number;
    roleName: string;
    /** Names (not IDs) of permissions being removed; the impact
     * endpoint accepts strings (permission names) per the backend
     * RoleImpactRequest. */
    removedPermissions: string[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
    'update:open': [value: boolean];
    accept: [];
    cancel: [];
}>();

const { t } = useI18n();

const impactQuery = useRoleImpactQuery(
    () => props.roleId,
    () => props.removedPermissions,
);

const isLoading = computed<boolean>(() => impactQuery.isLoading.value);
const isError = computed<boolean>(() => impactQuery.isError.value);

const affectedCount = computed<number>(
    () => impactQuery.data.value?.data.affected_users_count ?? 0,
);
const affectedPreview = computed<Array<{ id: number; name: string }>>(
    () => impactQuery.data.value?.data.affected_users_preview ?? [],
);

// "and N others" — only when count > preview.length.
const overflowCount = computed<number>(() => {
    return Math.max(0, affectedCount.value - affectedPreview.value.length);
});

function onAccept(): void {
    emit('accept');
    emit('update:open', false);
}

function onCancel(): void {
    emit('cancel');
    emit('update:open', false);
}
</script>

<template>
    <Dialog
        :visible="props.open"
        modal
        :header="t('admin.roles.updateWarning.title')"
        :style="{ width: '32rem' }"
        :closable="false"
        data-testid="role-update-warning-dialog"
        @update:visible="(v: boolean) => emit('update:open', v)"
    >
        <div data-testid="role-update-warning-body">
            <p class="text-sm text-text-secondary mb-4">
                {{ t('admin.roles.updateWarning.intro', { name: props.roleName }) }}
            </p>

            <div
                v-if="isLoading"
                class="text-sm text-text-tertiary"
                data-testid="role-update-warning-loading"
            >
                {{ t('admin.roles.updateWarning.loading') }}
            </div>

            <div
                v-else-if="isError"
                class="text-sm text-danger"
                data-testid="role-update-warning-error"
            >
                {{ t('admin.roles.updateWarning.error') }}
            </div>

            <template v-else>
                <p
                    class="text-sm font-medium text-text-primary"
                    data-testid="role-update-warning-count"
                >
                    {{ t('admin.roles.updateWarning.affectedCount', {
                        count: affectedCount,
                    }) }}
                </p>

                <ul
                    v-if="affectedPreview.length > 0"
                    class="mt-2 text-sm text-text-secondary list-disc list-inside"
                    data-testid="role-update-warning-preview"
                >
                    <li
                        v-for="user in affectedPreview"
                        :key="user.id"
                        :data-testid="`role-update-warning-preview-user-${user.id}`"
                    >
                        {{ user.name }}
                    </li>
                    <li
                        v-if="overflowCount > 0"
                        class="text-text-tertiary list-none"
                    >
                        {{ t('admin.roles.updateWarning.andOthers', {
                            count: overflowCount,
                        }) }}
                    </li>
                </ul>
            </template>
        </div>

        <template #footer>
            <Button
                :label="t('admin.roles.updateWarning.cancel')"
                severity="secondary"
                data-testid="role-update-warning-cancel"
                @click="onCancel"
            />
            <Button
                :label="t('admin.roles.updateWarning.accept')"
                severity="warn"
                data-testid="role-update-warning-accept"
                @click="onAccept"
            />
        </template>
    </Dialog>
</template>
