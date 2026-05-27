<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import type { useQuery } from '@tanstack/vue-query';

import CardSection from '@/shared/components/layout/CardSection.vue';
import {
    balanceSeverity,
    formatRemainingDays,
} from '@/modules/hrm/utils/leaveBalanceDisplay';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type {
    BalanceLeaveType,
    LeaveBalanceBrief,
    LeaveBalanceListResponse,
} from '@/modules/hrm/types/leaveBalance';

// ─────────────────────────────────────────────────────────────────────────────
// EmployeeLeaveBalancesCard — presentational component rendered on the
// EmployeeDetailPage. Surfaces the employee's allocated balances for
// the displayed year, with the same over-consumed labeling discipline
// the list and detail pages use.
//
// SINGLE SOURCE OF TRUTH for the labeling: routes through the shared
// balanceSeverity() + formatRemainingDays() helpers from
// leaveBalanceDisplay.ts. Same threshold (>= 1 / == 0 / < 0), same
// pluralized copy, same colour mapping. The four seeded edge cases
// (E-1003 -2 over, E-1002 0 exact, E-1002 sick 4.5 fractional,
// E-1005 +14 fresh) MUST render here identically to how they render
// on the list and detail pages. That identical rendering IS the
// centralized-helper payoff.
//
// Pure props in / events out. The TanStack Query result is owned by
// the page (or a parent composable) and passed in via `query`; this
// keeps the component testable without a Vue Query provider.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    employeeId: number;
    /** Period year displayed (typically the current calendar year). */
    periodYear: number;
    /** TanStack Query result for the employee's balances. The page
     *  owns the query (via useEmployeeLeaveBalancesQuery) so the
     *  card can stay presentational + unit-testable without a
     *  QueryClient provider. */
    query: ReturnType<typeof useQuery<LeaveBalanceListResponse>>;
}
const props = defineProps<Props>();

const { t } = useI18n();

const rows = computed<LeaveBalanceBrief[]>(() => props.query.data.value?.data ?? []);
const isLoading = computed<boolean>(() => props.query.isLoading.value);
const isError = computed<boolean>(() => props.query.isError.value);

function typeLabel(type: BalanceLeaveType): string {
    return t(`hrm.leaveBalance.leaveType.${type}`);
}

// Severity → text-colour class. Mirrors the LeaveBalanceListPage's
// remainingCellClasses(); kept in lockstep deliberately so the
// three surfaces (list cell, detail primary display, this card)
// look identical.
function remainingClasses(remaining: number): string {
    switch (balanceSeverity(remaining)) {
        case 'success':
            return 'text-success-text font-semibold';
        case 'neutral':
            return 'text-text-secondary font-semibold';
        case 'danger':
            return 'text-danger-text font-semibold';
    }
}
</script>

<template>
    <CardSection
        :title="t('hrm.employee.detail.leaveBalances.title', { year: periodYear })"
        data-testid="employee-detail-leave-balances-card"
    >
        <!-- Loading skeleton — minimal, just two muted rows so the
             card's height is stable while data resolves. -->
        <div
            v-if="isLoading"
            class="flex flex-col gap-2 py-2"
            data-testid="employee-detail-leave-balances-loading"
        >
            <div class="h-10 animate-pulse rounded bg-surface-muted"></div>
            <div class="h-10 animate-pulse rounded bg-surface-muted"></div>
        </div>

        <!-- Error state — friendly inline, no retry button. The page
             isn't fatally broken if the balances card fails (other
             sections still render); the user can refresh manually. -->
        <p
            v-else-if="isError"
            class="py-3 text-sm text-text-tertiary"
            data-testid="employee-detail-leave-balances-error"
        >
            {{ t('hrm.employee.detail.leaveBalances.error') }}
        </p>

        <!-- Empty state — no balance rows allocated yet for this
             year. Common for newly-onboarded employees; the
             "Manage balances" footer link below still appears so
             admins can allocate from here. -->
        <p
            v-else-if="rows.length === 0"
            class="py-3 text-sm text-text-tertiary"
            data-testid="employee-detail-leave-balances-empty"
        >
            {{ t('hrm.employee.detail.leaveBalances.empty', { year: periodYear }) }}
        </p>

        <!-- Populated — one row per balance. Three-column layout:
             type · remaining (load-bearing label) · "View detail" link.
             Stacks naturally with divide-y so the rows feel like a
             scannable list, not a card-within-a-card. -->
        <ul
            v-else
            class="divide-y divide-border-default"
            data-testid="employee-detail-leave-balances-list"
        >
            <li
                v-for="row in rows"
                :key="row.id"
                class="flex items-center justify-between gap-4 py-3"
            >
                <div class="flex min-w-0 items-baseline gap-3">
                    <span class="text-sm font-medium text-text-primary shrink-0">
                        {{ typeLabel(row.leave_type) }}
                    </span>
                    <span
                        class="text-sm tabular-nums"
                        :class="remainingClasses(row.remaining_days)"
                        :data-testid="`employee-detail-leave-balance-remaining-${row.id}`"
                        :data-severity="balanceSeverity(row.remaining_days)"
                    >
                        {{ formatRemainingDays(row.remaining_days, t) }}
                    </span>
                    <span class="text-xs text-text-tertiary tabular-nums shrink-0">
                        {{ t('hrm.employee.detail.leaveBalances.outOfAllocated', {
                            allocated: row.allocated_days,
                        }) }}
                    </span>
                </div>
                <RouterLink
                    :to="{
                        name: HRM_ROUTES.LEAVE_BALANCE_DETAIL,
                        params: { id: row.id },
                    }"
                    class="text-sm text-brand hover:underline focus:outline-none focus:underline shrink-0"
                    :data-testid="`employee-detail-leave-balance-view-${row.id}`"
                >
                    {{ t('hrm.employee.detail.leaveBalances.viewDetail') }}
                    <i class="pi pi-arrow-right text-xs ml-0.5" aria-hidden="true"></i>
                </RouterLink>
            </li>
        </ul>

        <!-- Footer link — always rendered (even on empty / error) so
             admins can manage balances regardless of the data state.
             Pre-filters the list page to this employee via the
             ?employee_id= URL param (the LB list reads it via
             useUrlNumericFilter, renders as a FilterChip on landing). -->
        <div class="mt-4 border-t border-border-default pt-3 text-right">
            <RouterLink
                :to="{
                    name: HRM_ROUTES.LEAVE_BALANCE_LIST,
                    query: { employee_id: employeeId },
                }"
                class="text-sm text-brand hover:underline focus:outline-none focus:underline"
                data-testid="employee-detail-leave-balances-manage-link"
            >
                {{ t('hrm.employee.detail.leaveBalances.manageBalances') }}
                <i class="pi pi-arrow-right text-xs ml-0.5" aria-hidden="true"></i>
            </RouterLink>
        </div>
    </CardSection>
</template>
