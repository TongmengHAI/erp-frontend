<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';

import CardSection from '@/shared/components/layout/CardSection.vue';
import StatusBadge, {
    type StatusSeverity,
} from '@/shared/components/data-display/StatusBadge.vue';
import { SUPER_ADMIN_ROUTES } from '@/modules/super-admin/routes';
import type { TenantBrief, TenantStatus } from '@/modules/super-admin/types/tenant';

// ─────────────────────────────────────────────────────────────────────────────
// RecentTenantsList — shared component for the dashboard's two
// recent-activity lists (signups + suspensions). Single component, two
// consumers, deliberate variants via the `variant` prop so empty-state
// + heading copy stays distinct per Q6.
//
// Items are click-through to the tenant detail page (RouterLink). The
// list itself doesn't paginate — backend caps at 10 (see
// SuperAdminDashboardService::RECENT_LIST_LIMIT). If a tile-level
// "view more" would be useful the SA can drill into the full tenants
// list with the corresponding status filter via the existing /tenants
// route.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    tenants: TenantBrief[];
    variant: 'signups' | 'suspensions';
    windowDays: number;
}

const props = defineProps<Props>();

const { t } = useI18n();

const isEmpty = computed<boolean>(() => props.tenants.length === 0);

const titleKey = computed<string>(() =>
    props.variant === 'signups'
        ? 'superAdmin.dashboard.lists.recentSignups.title'
        : 'superAdmin.dashboard.lists.recentSuspensions.title',
);

const subtitleKey = computed<string>(() =>
    props.variant === 'signups'
        ? 'superAdmin.dashboard.lists.recentSignups.subtitle'
        : 'superAdmin.dashboard.lists.recentSuspensions.subtitle',
);

const emptyKey = computed<string>(() =>
    props.variant === 'signups'
        ? 'superAdmin.dashboard.lists.recentSignups.empty'
        : 'superAdmin.dashboard.lists.recentSuspensions.empty',
);

function statusSeverity(status: TenantStatus): StatusSeverity {
    switch (status) {
        case 'active':
            return 'success';
        case 'suspended':
            return 'danger';
        case 'archived':
            return 'neutral';
    }
}
</script>

<template>
    <CardSection :data-testid="`list-recent-${props.variant}`">
        <div class="mb-3 flex items-baseline justify-between">
            <h3 class="text-sm font-semibold text-text-primary">
                {{ t(titleKey) }}
            </h3>
            <span class="text-xs text-text-tertiary">
                {{ t(subtitleKey, { days: props.windowDays }) }}
            </span>
        </div>

        <p
            v-if="isEmpty"
            class="py-6 text-center text-sm text-text-secondary"
            :data-testid="`list-recent-${props.variant}-empty`"
        >
            {{ t(emptyKey, { days: props.windowDays }) }}
        </p>

        <ul v-else class="flex flex-col divide-y divide-border-default">
            <li
                v-for="tenant in props.tenants"
                :key="tenant.id"
                class="flex items-center gap-3 py-2"
                :data-testid="`list-recent-${props.variant}-item-${tenant.id}`"
            >
                <RouterLink
                    :to="{ name: SUPER_ADMIN_ROUTES.TENANT_DETAIL, params: { id: tenant.id } }"
                    class="flex-1 truncate text-sm font-medium text-brand hover:underline"
                >
                    {{ tenant.name }}
                </RouterLink>
                <span class="hidden text-xs text-text-tertiary sm:inline">
                    {{ tenant.slug }}
                </span>
                <StatusBadge
                    :label="t(`superAdmin.tenants.status.${tenant.status}`)"
                    :severity="statusSeverity(tenant.status)"
                />
            </li>
        </ul>
    </CardSection>
</template>
