<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import CardSection from '@/shared/components/layout/CardSection.vue';
import DateDisplay from '@/shared/components/data-display/DateDisplay.vue';
import { useEmployeesQuery } from '@/modules/hrm/composables/useEmployees';
import { useLeaveRequestsQuery } from '@/modules/hrm/composables/useLeaveRequests';
import { formatLeaveRequestDateLabel } from '@/modules/hrm/composables/useLeaveRequestDateLabel';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import { useAuthStore } from '@/shared/stores/useAuthStore';

// ─────────────────────────────────────────────────────────────────────────────
// HrmDashboardPage — HRM app's landing page at /hrm.
//
// Three sections, each independently rendered. Per the locked
// design call: per-section skeletons, NOT a single global isLoading
// guard. A slow query for the approver queue shouldn't block the
// employee-count card from rendering. Each section reads its own
// query's isLoading / isError / data and renders accordingly —
// loading skeleton swaps to populated content the moment that
// specific query resolves.
//
// Sections:
//   1. Active employees count   — stat card, no link
//   2. Pending leave requests   — stat card, click → LR list filtered
//                                 to status=pending
//   3. Approver queue           — list of up to 5 pending LRs; rendered
//                                 ONLY when the user has
//                                 hrm.leave_request.approve. The query
//                                 itself is gated by `enabled` so non-
//                                 approvers don't fire it at all.
//
// per_page: 1 on the count queries — the response's meta.total gives
// the count without paying to serialize 25 rows. Real optimization,
// real data-shape decision: dashboards load fast or they don't get
// used.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const auth = useAuthStore();

// ─── Active employees count (Section 1) ───────────────────────────────────
const employeesQuery = useEmployeesQuery(() => ({
    status: 'active' as const,
    per_page: 1,
}));
const activeEmployeesCount = computed<number>(
    () => employeesQuery.data.value?.meta.total ?? 0,
);

// ─── Pending leave requests count (Section 2) ─────────────────────────────
const pendingLrCountQuery = useLeaveRequestsQuery(() => ({
    status: 'pending' as const,
    per_page: 1,
}));
const pendingLrCount = computed<number>(
    () => pendingLrCountQuery.data.value?.meta.total ?? 0,
);

// ─── Approver queue (Section 3) ───────────────────────────────────────────
// Permission-gated: the query itself doesn't fire for non-approvers
// (saves a useless fetch). Section also hidden in the template.
const canApprove = computed<boolean>(() => auth.can('hrm.leave_request.approve'));

const approverQueueQuery = useLeaveRequestsQuery(
    () => ({ status: 'pending' as const, per_page: 5 }),
    { enabled: canApprove },
);
const approverQueueRows = computed(
    () => approverQueueQuery.data.value?.data ?? [],
);
const approverQueueTotal = computed<number>(
    () => approverQueueQuery.data.value?.meta.total ?? 0,
);
// "View all" appears when there are more pending rows than the
// approver queue's per_page=5 surface.
const approverQueueHasMore = computed<boolean>(
    () => approverQueueTotal.value > approverQueueRows.value.length,
);
</script>

<template>
    <PageLayout>
        <!-- No breadcrumbs — the dashboard IS the app root.
             Breadcrumbs.vue's length-guard would render nothing for a
             single-item trail anyway; not passing the prop keeps the
             intent in the code rather than in a no-op array. -->
        <PageHeader
            :title="t('hrm.dashboard.title')"
            :subtitle="t('hrm.dashboard.subtitle')"
        />

        <!-- Stat-card grid: independently-loading per section so the
             slowest query doesn't gate the first paint. Two cards on
             desktop (auto-fit); collapses to one column on narrower. -->
        <div
            class="mb-6 grid gap-4"
            style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));"
        >
            <!-- Card 1: Active employees count.
                 Loading: muted skeleton number; Populated: actual count.
                 No link — purely informational. Error: graceful "—" so
                 the layout doesn't reflow. -->
            <CardSection
                :title="t('hrm.dashboard.activeEmployees.title')"
                data-testid="hrm-dashboard-active-employees-card"
            >
                <div v-if="employeesQuery.isLoading.value" class="py-2" data-testid="hrm-dashboard-active-employees-loading">
                    <div class="h-10 w-24 animate-pulse rounded bg-surface-muted"></div>
                </div>
                <div
                    v-else-if="employeesQuery.isError.value"
                    class="py-2 text-3xl font-semibold text-text-tertiary tabular-nums"
                    data-testid="hrm-dashboard-active-employees-error"
                >
                    —
                </div>
                <div
                    v-else
                    class="py-2 text-3xl font-semibold text-text-primary tabular-nums"
                    data-testid="hrm-dashboard-active-employees-value"
                >
                    {{ activeEmployeesCount }}
                </div>
                <p class="text-sm text-text-secondary">
                    {{ t('hrm.dashboard.activeEmployees.subtitle') }}
                </p>
            </CardSection>

            <!-- Card 2: Pending leave requests count.
                 Click → LR list filtered to status=pending (the Session-1
                 pre-flight wired useUrlEnumFilter, so this deep-link
                 actually filters). Whole card is the click target. -->
            <CardSection
                :title="t('hrm.dashboard.pendingLeaveRequests.title')"
                data-testid="hrm-dashboard-pending-lr-card"
            >
                <RouterLink
                    :to="{ name: HRM_ROUTES.LEAVE_REQUEST_LIST, query: { status: 'pending' } }"
                    class="block rounded -mx-2 px-2 py-1 hover:bg-surface-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    data-testid="hrm-dashboard-pending-lr-link"
                >
                    <div v-if="pendingLrCountQuery.isLoading.value" class="py-2" data-testid="hrm-dashboard-pending-lr-loading">
                        <div class="h-10 w-24 animate-pulse rounded bg-surface-muted"></div>
                    </div>
                    <div
                        v-else-if="pendingLrCountQuery.isError.value"
                        class="py-2 text-3xl font-semibold text-text-tertiary tabular-nums"
                        data-testid="hrm-dashboard-pending-lr-error"
                    >
                        —
                    </div>
                    <div
                        v-else
                        class="py-2 text-3xl font-semibold text-text-primary tabular-nums"
                        data-testid="hrm-dashboard-pending-lr-value"
                    >
                        {{ pendingLrCount }}
                    </div>
                    <p class="text-sm text-text-secondary">
                        {{ t('hrm.dashboard.pendingLeaveRequests.subtitle') }}
                    </p>
                </RouterLink>
            </CardSection>
        </div>

        <!-- Section 3: Approver queue — visible only when user has
             hrm.leave_request.approve. The query is gated by canApprove
             so non-approvers don't fire it (no skeleton flash, no
             cache write). Empty state for approvers with zero pending
             rows reads "Inbox is clear" — a positive end-state, not
             a missing-data warning. -->
        <CardSection
            v-if="canApprove"
            :title="t('hrm.dashboard.approverQueue.title')"
            :subtitle="t('hrm.dashboard.approverQueue.subtitle')"
            data-testid="hrm-dashboard-approver-queue-card"
        >
            <div
                v-if="approverQueueQuery.isLoading.value"
                class="flex flex-col gap-2 py-2"
                data-testid="hrm-dashboard-approver-queue-loading"
            >
                <div class="h-10 animate-pulse rounded bg-surface-muted"></div>
                <div class="h-10 animate-pulse rounded bg-surface-muted"></div>
                <div class="h-10 animate-pulse rounded bg-surface-muted"></div>
            </div>
            <p
                v-else-if="approverQueueQuery.isError.value"
                class="py-3 text-sm text-text-tertiary"
                data-testid="hrm-dashboard-approver-queue-error"
            >
                {{ t('hrm.dashboard.approverQueue.error') }}
            </p>
            <p
                v-else-if="approverQueueRows.length === 0"
                class="py-3 text-sm text-text-tertiary"
                data-testid="hrm-dashboard-approver-queue-empty"
            >
                {{ t('hrm.dashboard.approverQueue.empty') }}
            </p>
            <div v-else data-testid="hrm-dashboard-approver-queue-list">
                <ul class="divide-y divide-border-default">
                    <li
                        v-for="row in approverQueueRows"
                        :key="row.id"
                        class="flex items-center justify-between gap-4 py-3"
                    >
                        <div class="min-w-0">
                            <RouterLink
                                :to="{ name: HRM_ROUTES.LEAVE_REQUEST_DETAIL, params: { id: row.id } }"
                                class="text-text-primary font-medium hover:underline focus:outline-none focus:underline"
                                :data-testid="`hrm-dashboard-approver-queue-link-${row.id}`"
                            >
                                {{ row.employee_name ?? t('hrm.dashboard.approverQueue.deletedEmployee') }}
                            </RouterLink>
                            <div class="text-xs text-text-tertiary mt-0.5">
                                <span>{{ t(`hrm.leaveRequest.type.${row.leave_type}`) }}</span>
                                <span class="mx-1.5">·</span>
                                <span class="tabular-nums">{{
                                    formatLeaveRequestDateLabel({
                                        start_date: row.start_date,
                                        end_date: row.end_date,
                                        day_part: row.day_part,
                                    }, t)
                                }}</span>
                            </div>
                        </div>
                        <DateDisplay
                            :date="row.start_date"
                            format="short"
                            class="text-xs text-text-tertiary tabular-nums shrink-0"
                        />
                    </li>
                </ul>
                <div
                    v-if="approverQueueHasMore"
                    class="mt-4 border-t border-border-default pt-3 text-right"
                >
                    <RouterLink
                        :to="{ name: HRM_ROUTES.LEAVE_REQUEST_LIST, query: { status: 'pending' } }"
                        class="text-sm text-brand hover:underline focus:outline-none focus:underline"
                        data-testid="hrm-dashboard-approver-queue-view-all"
                    >
                        {{ t('hrm.dashboard.approverQueue.viewAll', { n: approverQueueTotal }) }}
                        <i class="pi pi-arrow-right text-xs ml-0.5" aria-hidden="true"></i>
                    </RouterLink>
                </div>
            </div>
        </CardSection>
    </PageLayout>
</template>
