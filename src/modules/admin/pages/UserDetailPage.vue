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
import StatusBadge, {
    type StatusSeverity,
} from '@/shared/components/data-display/StatusBadge.vue';

import {
    useAdminUserQuery,
    useDeactivateUserMutation,
    useDisableUserMutation,
    useEnableUserMutation,
    useRestoreUserMutation,
} from '@/modules/admin/composables/useAdminUsers';
import { ADMIN_ROUTES } from '@/modules/admin/routes';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';
import type { BreadcrumbItem } from '@/shared/types/navigation';
import type { AdminUser } from '@/modules/admin/types/user';

// ─────────────────────────────────────────────────────────────────────────────
// UserDetailPage — Phase 2A Sessions 3 (read) + 4 (lifecycle actions).
//
// 5-state matrix at the PAGE level (§10.18):
//   permission-denied → loading → 404 → error → populated
//
// Action surface (Session 4):
//   • Edit         — header link to /admin/users/:id/edit
//   • Disable      — visible when status=active AND not-deactivated AND
//                    target ≠ acting user (self-action guard)
//   • Enable       — visible when status=inactive AND not-deactivated
//   • Deactivate   — visible when not-deactivated AND target ≠ acting
//                    user (self-action guard)
//   • Restore      — visible when is_deactivated
//
// Self-action guard per Phase 2A locked decision:
//   • UI hides Disable + Deactivate on the actor's own row
//   • API independently enforces (Session 2 backend test pins this with
//     403 error_code='self_action_forbidden')
//   • Defense in depth: UI prevents accidental clicks; API stops URL
//     manipulation or API client abuse
//
// Destructive-action confirmations use SPECIFIC copy (per locked
// decision), not "Are you sure?". The two actions have different
// semantics — Disable is reversible (re-enable), Deactivate is
// audit-tagged hard-removal with a separate Restore path. The copy
// reflects that.
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

const canViewUsers = computed<boolean>(() => auth.can('users.view'));
const canUpdate = computed<boolean>(() => auth.can('users.update'));
const canDisable = computed<boolean>(() => auth.can('users.disable'));
const canDeactivate = computed<boolean>(() => auth.can('users.deactivate'));

const userId = computed<number>(() => props.id ?? 0);

const { data, isLoading, isError, error, refetch } = useAdminUserQuery(userId);

// ─── Self-action guard — UI side ────────────────────────────────────────────
// The acting user's id from useAuthStore. Disable + Deactivate buttons
// check `target.id !== actor.id` before rendering. Pair with the API-
// side guard in Session 2's SelfActionForbiddenException.
const actorId = computed<number | null>(() => auth.user?.id ?? null);
const isSelf = computed<boolean>(() => {
    const targetId = data.value?.data?.id ?? null;
    return targetId !== null && actorId.value !== null && targetId === actorId.value;
});

// ─── Lifecycle mutations ────────────────────────────────────────────────────
const disableMutation = useDisableUserMutation();
const enableMutation = useEnableUserMutation();
const deactivateMutation = useDeactivateUserMutation();
const restoreMutation = useRestoreUserMutation();

async function runMutation(
    label: string,
    mutate: () => Promise<unknown>,
): Promise<void> {
    try {
        await mutate();
        toast.add({
            severity: 'success',
            summary: t(`admin.users.toast.${label}`),
            life: 3000,
        });
    } catch (e: unknown) {
        // 403 self_action_forbidden — the UI guard SHOULD have hidden
        // this button, but defense-in-depth means we surface a friendly
        // toast rather than the generic unknown error. URL manipulation
        // or API client abuse routes here.
        if (axios.isAxiosError(e) && e.response?.status === 403) {
            const body = e.response.data as { error_code?: string };
            if (body?.error_code === 'self_action_forbidden') {
                toast.add({
                    severity: 'warn',
                    summary: t('admin.users.toast.selfAction'),
                    life: 4000,
                });
                return;
            }
        }
        toast.add({
            severity: 'error',
            summary: t('admin.users.toast.unknown'),
            life: 4000,
        });
    }
}

function onDisable(): void {
    if (!props.id) return;
    confirmAction({
        message: t('admin.users.confirm.disable.message'),
        severity: 'warning',
        acceptLabel: t('admin.users.confirm.disable.accept'),
        onAccept: () => runMutation('disabled', () => disableMutation.mutateAsync(props.id!)),
    });
}

function onEnable(): void {
    if (!props.id) return;
    // No confirmation — Enable is non-destructive.
    void runMutation('enabled', () => enableMutation.mutateAsync(props.id!));
}

function onDeactivate(): void {
    if (!props.id) return;
    confirmAction({
        message: t('admin.users.confirm.deactivate.message'),
        severity: 'danger',
        acceptLabel: t('admin.users.confirm.deactivate.accept'),
        onAccept: () => runMutation('deactivated', () => deactivateMutation.mutateAsync(props.id!)),
    });
}

function onRestore(): void {
    if (!props.id) return;
    // No confirmation — Restore is a "yes please" admin action;
    // adding friction here punishes the recovery path.
    void runMutation('restored', () => restoreMutation.mutateAsync(props.id!));
}

function onEdit(): void {
    if (!props.id) return;
    void router.push({
        name: ADMIN_ROUTES.USER_EDIT,
        params: { id: props.id },
    });
}

// ─── Action-visibility predicates ──────────────────────────────────────────
// All are reactive computed values. The buttons gate on:
//   • permission
//   • lifecycle state of the target
//   • self-action guard (for Disable + Deactivate)
const showDisable = computed<boolean>(() => {
    const u = data.value?.data;
    if (!u) return false;
    if (!canDisable.value) return false;
    if (u.is_deactivated) return false;
    if (u.status !== 'active') return false;
    if (isSelf.value) return false;
    return true;
});

const showEnable = computed<boolean>(() => {
    const u = data.value?.data;
    if (!u) return false;
    if (!canUpdate.value) return false;
    if (u.is_deactivated) return false;
    if (u.status !== 'inactive') return false;
    return true;
});

const showDeactivate = computed<boolean>(() => {
    const u = data.value?.data;
    if (!u) return false;
    if (!canDeactivate.value) return false;
    if (u.is_deactivated) return false;
    if (isSelf.value) return false;
    return true;
});

const showRestore = computed<boolean>(() => {
    const u = data.value?.data;
    if (!u) return false;
    if (!canDeactivate.value) return false;
    if (!u.is_deactivated) return false;
    return true;
});

const isNotFound = computed<boolean>(() => {
    if (!isError.value) return false;
    const err = error.value;
    if (axios.isAxiosError(err)) return err.response?.status === 404;
    return false;
});
const isGenericLoadError = computed<boolean>(
    () => isError.value && !isNotFound.value,
);

const user = computed<AdminUser | null>(() => data.value?.data ?? null);

// Status displays the same way as the list page — lifecycle-aware:
// 'deactivated' overrides the status enum because deleted_at gates
// login regardless of the status value.
function statusSeverity(u: AdminUser): StatusSeverity {
    if (u.is_deactivated) return 'neutral';
    return u.status === 'active' ? 'success' : 'warning';
}

function statusLabel(u: AdminUser): string {
    if (u.is_deactivated) return t('admin.users.status.deactivated');
    return t(`admin.users.status.${u.status}`);
}

const pageTitle = computed<string>(() =>
    user.value?.name ?? t('admin.users.detail.breadcrumb'),
);

const breadcrumbs = computed<BreadcrumbItem[]>(() => [
    {
        label: t('admin.users.list.breadcrumb'),
        to: { name: ADMIN_ROUTES.USER_LIST },
    },
    { label: user.value?.name ?? t('admin.users.detail.breadcrumb') },
]);

function formatDate(iso: string | null): string {
    if (iso === null) return '—';
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(d);
}
</script>

<template>
    <PageLayout width="narrow">
        <!-- STATE 1: permission-denied (page-level, precedes data-fetch) -->
        <template v-if="!canViewUsers">
            <PermissionDeniedPage
                data-testid="user-detail-permission-denied"
                :resource="t('admin.users.detail.breadcrumb')"
            />
        </template>

        <!-- STATE 2: loading -->
        <template v-else-if="isLoading">
            <LoadingState variant="detail" data-testid="user-detail-loading" />
        </template>

        <!-- STATE 3: 404 — target user is in another tenant, deleted at the
             DB layer, or never existed. The controller-level cross-tenant
             gate returns 404 for foreign users (User isn't tenant-scoped
             via global scope). -->
        <template v-else-if="isNotFound">
            <NotFoundPage data-testid="user-detail-not-found" />
        </template>

        <!-- STATE 4: error -->
        <template v-else-if="isGenericLoadError">
            <ErrorState
                data-testid="user-detail-error"
                @retry="() => void refetch()"
            />
        </template>

        <!-- STATE 5: populated -->
        <template v-else-if="user">
            <PageHeader :title="pageTitle" :breadcrumbs="breadcrumbs">
                <template #actions>
                    <Button
                        v-if="canUpdate"
                        :label="t('admin.users.actions.edit')"
                        icon="pi pi-pencil"
                        severity="secondary"
                        data-testid="user-detail-edit"
                        @click="onEdit"
                    />
                    <Button
                        v-if="showEnable"
                        :label="t('admin.users.actions.enable')"
                        icon="pi pi-check"
                        severity="success"
                        :loading="enableMutation.isPending.value"
                        data-testid="user-detail-enable"
                        @click="onEnable"
                    />
                    <Button
                        v-if="showDisable"
                        :label="t('admin.users.actions.disable')"
                        icon="pi pi-ban"
                        severity="warn"
                        :loading="disableMutation.isPending.value"
                        data-testid="user-detail-disable"
                        @click="onDisable"
                    />
                    <Button
                        v-if="showRestore"
                        :label="t('admin.users.actions.restore')"
                        icon="pi pi-refresh"
                        severity="secondary"
                        :loading="restoreMutation.isPending.value"
                        data-testid="user-detail-restore"
                        @click="onRestore"
                    />
                    <Button
                        v-if="showDeactivate"
                        :label="t('admin.users.actions.deactivate')"
                        icon="pi pi-trash"
                        severity="danger"
                        :loading="deactivateMutation.isPending.value"
                        data-testid="user-detail-deactivate"
                        @click="onDeactivate"
                    />
                </template>
            </PageHeader>

            <CardSection :title="t('admin.users.detail.sections.profile')">
                <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('admin.users.detail.fields.name') }}
                        </dt>
                        <dd
                            class="mt-1 text-sm text-text-primary"
                            data-testid="user-detail-name"
                        >
                            {{ user.name }}
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('admin.users.detail.fields.email') }}
                        </dt>
                        <dd
                            class="mt-1 text-sm text-text-primary"
                            data-testid="user-detail-email"
                        >
                            {{ user.email }}
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('admin.users.detail.fields.type') }}
                        </dt>
                        <dd class="mt-1 text-sm text-text-primary">
                            {{ t(`admin.users.type.${user.type}`) }}
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('admin.users.detail.fields.emailVerifiedAt') }}
                        </dt>
                        <dd class="mt-1 text-sm text-text-primary">
                            <template v-if="user.email_verified_at">
                                {{ formatDate(user.email_verified_at) }}
                            </template>
                            <template v-else>
                                <span class="text-text-tertiary">
                                    {{ t('admin.users.detail.values.neverVerified') }}
                                </span>
                            </template>
                        </dd>
                    </div>
                </dl>
            </CardSection>

            <CardSection
                :title="t('admin.users.detail.sections.lifecycle')"
                class="mt-4"
            >
                <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('admin.users.detail.fields.status') }}
                        </dt>
                        <dd class="mt-1" data-testid="user-detail-status">
                            <StatusBadge
                                :label="statusLabel(user)"
                                :severity="statusSeverity(user)"
                            />
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('admin.users.detail.fields.deletedAt') }}
                        </dt>
                        <dd class="mt-1 text-sm text-text-primary">
                            <template v-if="user.deleted_at">
                                {{ formatDate(user.deleted_at) }}
                            </template>
                            <template v-else>
                                <span class="text-text-tertiary">
                                    {{ t('admin.users.detail.values.notDeactivated') }}
                                </span>
                            </template>
                        </dd>
                    </div>
                </dl>
            </CardSection>

            <CardSection
                :title="t('admin.users.detail.sections.role')"
                class="mt-4"
            >
                <p
                    v-if="user.role"
                    class="text-sm text-text-primary"
                    data-testid="user-detail-role"
                >
                    {{ user.role.name }}
                </p>
                <p v-else class="text-sm text-text-tertiary">
                    {{ t('admin.users.detail.values.noRole') }}
                </p>
            </CardSection>

            <CardSection
                :title="t('admin.users.detail.sections.timestamps')"
                class="mt-4"
            >
                <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('admin.users.detail.fields.createdAt') }}
                        </dt>
                        <dd class="mt-1 text-sm text-text-primary">
                            {{ formatDate(user.created_at) }}
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs font-medium uppercase text-text-tertiary">
                            {{ t('admin.users.detail.fields.updatedAt') }}
                        </dt>
                        <dd class="mt-1 text-sm text-text-primary">
                            {{ formatDate(user.updated_at) }}
                        </dd>
                    </div>
                </dl>
            </CardSection>
        </template>
    </PageLayout>
</template>
