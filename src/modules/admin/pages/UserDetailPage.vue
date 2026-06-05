<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from 'axios';

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

import { useAdminUserQuery } from '@/modules/admin/composables/useAdminUsers';
import { ADMIN_ROUTES } from '@/modules/admin/routes';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import type { BreadcrumbItem } from '@/shared/types/navigation';
import type { AdminUser } from '@/modules/admin/types/user';

// ─────────────────────────────────────────────────────────────────────────────
// UserDetailPage — Phase 2A Session 3 (read-only).
//
// Edit + the four lifecycle actions (Disable/Enable/Deactivate/Restore)
// land in Session 4. This page exists so the list page's "View" action
// has a target, and so the read-side shape of the AdminUserResource is
// exercised end-to-end before the write surface ships.
//
// 5-state matrix at the PAGE level mirrors UserListPage (§10.18):
//   permission-denied → loading → 404 → error → populated
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    id?: number;
}
const props = defineProps<Props>();

const { t } = useI18n();
const auth = useAuthStore();

const canViewUsers = computed<boolean>(() => auth.can('users.view'));

const userId = computed<number>(() => props.id ?? 0);

const { data, isLoading, isError, error, refetch } = useAdminUserQuery(userId);

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
            <PageHeader :title="pageTitle" :breadcrumbs="breadcrumbs" />

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
