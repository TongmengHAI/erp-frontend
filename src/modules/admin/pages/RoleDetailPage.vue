<script setup lang="ts">
import axios from 'axios';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import CardSection from '@/shared/components/layout/CardSection.vue';
import LoadingState from '@/shared/components/state/LoadingState.vue';
import ErrorState from '@/shared/components/state/ErrorState.vue';
import NotFoundPage from '@/shared/components/state/NotFoundPage.vue';
import PermissionDeniedPage from '@/shared/components/state/PermissionDeniedPage.vue';
import StatusBadge from '@/shared/components/data-display/StatusBadge.vue';

import PermissionList from '@/modules/admin/components/PermissionList.vue';
import {
    useAdminRoleQuery,
    useDeleteRoleMutation,
} from '@/modules/admin/composables/useAdminRoles';
import { ADMIN_ROUTES } from '@/modules/admin/routes';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';
import type { BreadcrumbItem } from '@/shared/types/navigation';
import type { AdminRole } from '@/modules/admin/types/role';

// ─────────────────────────────────────────────────────────────────────────────
// RoleDetailPage — admin role detail (Phase 2B Session 3).
//
// 5-state matrix at the PAGE level per §10.18:
//   permission-denied → loading → 404 → error → populated
//
// System vs custom button visibility (Session 3 deliberate item #3 +
// Phase 2B Q1/Q15 locked decision):
//   - System rows: Edit + Delete buttons DO NOT render. The page
//     shows them as read-only with their i18n description. The
//     PermissionList component handles the read-only permission tree.
//   - Custom rows: Edit + Delete render conditionally on the actor's
//     roles.update + roles.delete permissions.
//
// PermissionList (not PermissionPicker readonly) is what renders the
// permission tree on the detail page. PermissionList is SEPARATE from
// PermissionPicker — different UX intent. See PermissionList.vue's
// docblock + the useGroupedPermissions composable for the shared
// data-shape contract between the two.
//
// Destructive action — Delete:
//   • Confirmation dialog with specific copy (not "Are you sure?")
//   • On role_in_use 422 → friendly toast with users_count surface
//     ("Cannot delete — N users are currently assigned to this role.")
//   • On system_role_immutable 403 → friendly toast (should never
//     happen because the UI hides the button; defense-in-depth)
//   • On success → navigate back to the list page
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    id?: number;
}
const props = defineProps<Props>();

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const auth = useAuthStore();
const { confirmAction } = useAppConfirm();

const canViewRoles = computed<boolean>(() => auth.can('roles.view'));
const canUpdateRoles = computed<boolean>(() => auth.can('roles.update'));
const canDeleteRoles = computed<boolean>(() => auth.can('roles.delete'));

const roleId = computed<number>(() => props.id ?? 0);

const { data, isLoading, isError, error, refetch } = useAdminRoleQuery(roleId);

const deleteMutation = useDeleteRoleMutation();

const isNotFound = computed<boolean>(() => {
    if (!isError.value) return false;
    const err = error.value;
    if (axios.isAxiosError(err)) return err.response?.status === 404;
    return false;
});
const isGenericLoadError = computed<boolean>(
    () => isError.value && !isNotFound.value,
);

const role = computed<AdminRole | null>(() => data.value?.data ?? null);

const isSystemRole = computed<boolean>(() => role.value?.is_system === true);
const isCustomRole = computed<boolean>(() => role.value?.is_custom === true);

// Edit / Delete render ONLY for custom roles. System roles are immutable
// per the locked decision.
const showEdit = computed<boolean>(
    () => isCustomRole.value && canUpdateRoles.value,
);
const showDelete = computed<boolean>(
    () => isCustomRole.value && canDeleteRoles.value,
);

function onEdit(): void {
    if (!props.id) return;
    void router.push({
        name: ADMIN_ROUTES.ROLE_EDIT,
        params: { id: props.id },
    });
}

async function performDelete(): Promise<void> {
    if (!props.id) return;
    try {
        await deleteMutation.mutateAsync(props.id);
        toast.add({
            severity: 'success',
            summary: t('admin.roles.toast.deleted'),
            life: 3000,
        });
        void router.push({ name: ADMIN_ROUTES.ROLE_LIST });
    } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
            // 422 role_in_use — the actionable shape: users_count comes
            // from the backend RoleInUseException body. The toast surfaces
            // the count so the admin knows how many to reassign.
            if (e.response?.status === 422) {
                const body = e.response.data as {
                    error_code?: string;
                    users_count?: number;
                };
                if (body?.error_code === 'role_in_use') {
                    toast.add({
                        severity: 'warn',
                        summary: t('admin.roles.toast.roleInUse', {
                            count: body.users_count ?? 0,
                        }),
                        life: 6000,
                    });
                    return;
                }
            }
            // 403 system_role_immutable — defense in depth (the UI
            // already hides the button on system rows).
            if (e.response?.status === 403) {
                const body = e.response.data as { error_code?: string };
                if (body?.error_code === 'system_role_immutable') {
                    toast.add({
                        severity: 'warn',
                        summary: t('admin.roles.toast.systemImmutable'),
                        life: 4000,
                    });
                    return;
                }
            }
        }
        toast.add({
            severity: 'error',
            summary: t('admin.roles.toast.unknown'),
            life: 4000,
        });
    }
}

function onDelete(): void {
    const r = role.value;
    if (!r) return;
    confirmAction({
        message: t('admin.roles.confirm.delete.message', { name: r.label }),
        severity: 'danger',
        acceptLabel: t('admin.roles.confirm.delete.accept'),
        onAccept: () => performDelete(),
    });
}

const pageTitle = computed<string>(
    () => role.value?.label ?? t('admin.roles.detail.breadcrumb'),
);

const breadcrumbs = computed<BreadcrumbItem[]>(() => [
    {
        label: t('admin.roles.list.breadcrumb'),
        to: { name: ADMIN_ROUTES.ROLE_LIST },
    },
    { label: role.value?.label ?? t('admin.roles.detail.breadcrumb') },
]);

function formatDate(iso: string): string {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(d);
}
</script>

<template>
    <PageLayout width="narrow">
        <template v-if="!canViewRoles">
            <PermissionDeniedPage
                data-testid="role-detail-permission-denied"
                :resource="t('admin.roles.detail.breadcrumb')"
            />
        </template>

        <template v-else-if="isLoading">
            <LoadingState
                variant="detail"
                data-testid="role-detail-loading"
            />
        </template>

        <template v-else-if="isNotFound">
            <NotFoundPage data-testid="role-detail-not-found" />
        </template>

        <template v-else-if="isGenericLoadError">
            <ErrorState
                data-testid="role-detail-error"
                @retry="() => void refetch()"
            />
        </template>

        <template v-else-if="role">
            <PageHeader
                :title="pageTitle"
                :breadcrumbs="breadcrumbs"
            >
                <template #actions>
                    <Button
                        v-if="showEdit"
                        :label="t('admin.roles.actions.edit')"
                        icon="pi pi-pencil"
                        severity="secondary"
                        data-testid="role-detail-edit"
                        @click="onEdit"
                    />
                    <Button
                        v-if="showDelete"
                        :label="t('admin.roles.actions.delete')"
                        icon="pi pi-trash"
                        severity="danger"
                        :loading="deleteMutation.isPending.value"
                        data-testid="role-detail-delete"
                        @click="onDelete"
                    />
                </template>
            </PageHeader>

            <CardSection :title="t('admin.roles.detail.sections.overview')">
                <dl class="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-8">
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('admin.roles.detail.fields.name') }}
                        </dt>
                        <dd
                            class="mt-1 text-sm text-text-primary"
                            data-testid="role-detail-name"
                        >
                            {{ role.label }}
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('admin.roles.detail.fields.kind') }}
                        </dt>
                        <dd class="mt-1 text-sm">
                            <StatusBadge
                                v-if="isSystemRole"
                                :label="t('admin.roles.list.kind.system')"
                                severity="info"
                                data-testid="role-detail-badge-system"
                            />
                            <span
                                v-else
                                class="text-text-secondary"
                                data-testid="role-detail-badge-custom"
                            >
                                {{ t('admin.roles.list.kind.custom') }}
                            </span>
                        </dd>
                    </div>
                    <div class="sm:col-span-2">
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('admin.roles.detail.fields.description') }}
                        </dt>
                        <dd
                            class="mt-1 text-sm text-text-secondary whitespace-pre-line"
                            data-testid="role-detail-description"
                        >
                            <template v-if="role.description">{{ role.description }}</template>
                            <span
                                v-else
                                class="text-text-tertiary"
                            >{{ t('admin.roles.detail.values.noDescription') }}</span>
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('admin.roles.detail.fields.usersCount') }}
                        </dt>
                        <dd
                            class="mt-1 text-sm font-medium tabular-nums text-text-primary"
                            data-testid="role-detail-users-count"
                        >
                            {{ role.users_count }}
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('admin.roles.detail.fields.createdAt') }}
                        </dt>
                        <dd class="mt-1 text-sm text-text-secondary">
                            {{ formatDate(role.created_at) }}
                        </dd>
                    </div>
                </dl>
            </CardSection>

            <CardSection
                :title="t('admin.roles.detail.sections.permissions')"
                class="mt-4"
            >
                <PermissionList :permissions="role.permissions ?? []" />
            </CardSection>
        </template>
    </PageLayout>
</template>
