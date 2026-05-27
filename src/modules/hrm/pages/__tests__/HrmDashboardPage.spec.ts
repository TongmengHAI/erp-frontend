import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

import { useAuthStore } from '@/shared/stores/useAuthStore';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// HrmDashboardPage — 5-state matrix per §7.J, adapted to the dashboard's
// three-section nature:
//
//   1. Loading                  — all three queries in flight; per-section
//                                 skeletons render independently (no global
//                                 spinner). This is the load-bearing test
//                                 for the locked design call.
//   2. Populated                — counts + approver queue render
//   3. Empty                    — approver-queue empty state when zero
//                                 pending rows (approver has no inbox)
//   4. Error (per section)      — query failure renders the section's
//                                 placeholder, not a global page-level error
//   5. Approver hidden          — non-approver user: the approver-queue
//                                 SECTION is gone from the DOM (not just
//                                 the rows; the whole card)
//
// Strategy: mock the composable modules (useEmployees + useLeaveRequests)
// with a controllable per-test surface. The mocks return refs so the
// page's `query.isLoading.value` / `query.data.value?.meta.total`
// access pattern works exactly as TanStack Query would expose it.
// No QueryClient setup required.
// ─────────────────────────────────────────────────────────────────────────────

// Mock surfaces — each test mutates these refs to drive the page's
// reactive state.
const employeesIsLoading = ref(false);
const employeesIsError = ref(false);
const employeesData = ref<{ meta: { total: number } } | undefined>(undefined);

const pendingCountIsLoading = ref(false);
const pendingCountIsError = ref(false);
const pendingCountData = ref<{ meta: { total: number } } | undefined>(undefined);

const approverQueueIsLoading = ref(false);
const approverQueueIsError = ref(false);
const approverQueueData = ref<
    { data: Array<Record<string, unknown>>; meta: { total: number } } | undefined
>(undefined);

vi.mock('@/modules/hrm/composables/useEmployees', () => ({
    useEmployeesQuery: () => ({
        isLoading: employeesIsLoading,
        isError: employeesIsError,
        data: employeesData,
    }),
}));

vi.mock('@/modules/hrm/composables/useLeaveRequests', () => ({
    useLeaveRequestsQuery: (
        _params: unknown,
        opts?: { enabled?: { value: boolean } | boolean },
    ) => {
        // The second call (per_page: 5) is the approver queue. Distinguish
        // by the `enabled` option presence — only the approver-queue call
        // passes options. The count-only call passes none.
        if (opts && opts.enabled !== undefined) {
            return {
                isLoading: approverQueueIsLoading,
                isError: approverQueueIsError,
                data: approverQueueData,
            };
        }
        return {
            isLoading: pendingCountIsLoading,
            isError: pendingCountIsError,
            data: pendingCountData,
        };
    },
}));

const STUB = { template: '<div />' };
const NAV_ROUTES: RouteRecordRaw[] = [
    { path: '/apps', name: 'launcher', component: STUB },
    { path: '/hrm', name: 'hrm.dashboard', component: STUB },
    { path: '/hrm/employees', name: 'hrm.employee.list', component: STUB },
    { path: '/hrm/leave-requests', name: 'hrm.leaveRequest.list', component: STUB },
    {
        path: '/hrm/leave-requests/:id',
        name: 'hrm.leaveRequest.detail',
        component: STUB,
    },
];

function reset(): void {
    employeesIsLoading.value = false;
    employeesIsError.value = false;
    employeesData.value = undefined;
    pendingCountIsLoading.value = false;
    pendingCountIsError.value = false;
    pendingCountData.value = undefined;
    approverQueueIsLoading.value = false;
    approverQueueIsError.value = false;
    approverQueueData.value = undefined;
}

function seedApprover(): void {
    useAuthStore().$patch({
        user: { id: 1, name: 'Approver', email: 'a@x', email_verified_at: null },
        permissions: ['hrm.leave_request.approve', 'hrm.employee.view'],
    });
}

function seedNonApprover(): void {
    useAuthStore().$patch({
        user: { id: 2, name: 'Viewer', email: 'v@x', email_verified_at: null },
        permissions: ['hrm.employee.view'],
    });
}

// Lazy import the page AFTER the mocks above register.
async function mountPage() {
    const { default: HrmDashboardPage } = await import('@/modules/hrm/pages/HrmDashboardPage.vue');
    return mountWithGlobals(HrmDashboardPage, { routes: NAV_ROUTES });
}

describe('HrmDashboardPage', () => {
    beforeEach(() => {
        reset();
    });

    it('per-section skeletons render independently while queries are loading', async () => {
        // LOAD-BEARING: this is the design call. A slow query for the
        // approver queue MUST NOT block the employees-count card from
        // rendering. Each section reads its own query's isLoading and
        // renders its own skeleton.
        //
        // Seed the mock query state BEFORE mount so the page reads
        // populated refs on first render. Auth store seeding happens
        // AFTER mount (Pinia is created inside mountWithGlobals).
        employeesIsLoading.value = true;
        pendingCountIsLoading.value = true;
        approverQueueIsLoading.value = true;

        const w = await mountPage();
        seedApprover();
        await w.vm.$nextTick();

        expect(w.find('[data-testid="hrm-dashboard-active-employees-loading"]').exists()).toBe(true);
        expect(w.find('[data-testid="hrm-dashboard-pending-lr-loading"]').exists()).toBe(true);
        expect(w.find('[data-testid="hrm-dashboard-approver-queue-loading"]').exists()).toBe(true);
        // No populated values rendered yet.
        expect(w.find('[data-testid="hrm-dashboard-active-employees-value"]').exists()).toBe(false);
    });

    it('the fastest query resolves first — its section pops in while others still show skeletons', async () => {
        // Direct verification of the independent-rendering property.
        // Employees resolves; pending count + approver queue still loading.
        employeesIsLoading.value = false;
        employeesData.value = { meta: { total: 6 } };
        pendingCountIsLoading.value = true;
        approverQueueIsLoading.value = true;

        const w = await mountPage();
        seedApprover();
        await w.vm.$nextTick();

        // Employees: populated.
        expect(w.find('[data-testid="hrm-dashboard-active-employees-value"]').text()).toBe('6');
        // Others: still skeletons.
        expect(w.find('[data-testid="hrm-dashboard-pending-lr-loading"]').exists()).toBe(true);
        expect(w.find('[data-testid="hrm-dashboard-approver-queue-loading"]').exists()).toBe(true);
    });

    it('renders populated counts + approver queue rows in the fully-loaded state', async () => {
        employeesData.value = { meta: { total: 6 } };
        pendingCountData.value = { meta: { total: 2 } };
        approverQueueData.value = {
            data: [
                {
                    id: 11,
                    employee_name: 'Sokha Chan',
                    leave_type: 'annual',
                    start_date: '2026-06-15',
                    end_date: '2026-06-17',
                    day_part: 'full_day',
                },
                {
                    id: 12,
                    employee_name: 'Dara Heng',
                    leave_type: 'sick',
                    start_date: '2026-06-20',
                    end_date: '2026-06-20',
                    day_part: 'morning',
                },
            ],
            meta: { total: 2 },
        };

        const w = await mountPage();
        seedApprover();
        await w.vm.$nextTick();

        expect(w.find('[data-testid="hrm-dashboard-active-employees-value"]').text()).toBe('6');
        expect(w.find('[data-testid="hrm-dashboard-pending-lr-value"]').text()).toBe('2');
        expect(w.find('[data-testid="hrm-dashboard-approver-queue-list"]').exists()).toBe(true);
        expect(w.find('[data-testid="hrm-dashboard-approver-queue-link-11"]').exists()).toBe(true);
        expect(w.find('[data-testid="hrm-dashboard-approver-queue-link-12"]').exists()).toBe(true);
        // Total equals visible rows → no "View all" link.
        expect(w.find('[data-testid="hrm-dashboard-approver-queue-view-all"]').exists()).toBe(false);
    });

    it('renders "View all" when pending total exceeds the surfaced rows', async () => {
        employeesData.value = { meta: { total: 6 } };
        pendingCountData.value = { meta: { total: 12 } };
        // Surfaced rows: 5. Total: 12. "View all (12)" should appear.
        approverQueueData.value = {
            data: Array.from({ length: 5 }, (_, i) => ({
                id: 100 + i,
                employee_name: `Employee ${i}`,
                leave_type: 'annual',
                start_date: '2026-06-15',
                end_date: '2026-06-15',
                day_part: 'full_day',
            })),
            meta: { total: 12 },
        };

        const w = await mountPage();
        seedApprover();
        await w.vm.$nextTick();

        expect(w.find('[data-testid="hrm-dashboard-approver-queue-view-all"]').exists()).toBe(true);
    });

    it('renders approver-queue empty state when an approver has zero pending rows', async () => {
        // Inbox-is-clear state. The empty state copy is positive
        // ("Inbox is clear"), not a missing-data warning.
        employeesData.value = { meta: { total: 6 } };
        pendingCountData.value = { meta: { total: 0 } };
        approverQueueData.value = { data: [], meta: { total: 0 } };

        const w = await mountPage();
        seedApprover();
        await w.vm.$nextTick();

        expect(w.find('[data-testid="hrm-dashboard-approver-queue-empty"]').exists()).toBe(true);
        expect(w.find('[data-testid="hrm-dashboard-approver-queue-list"]').exists()).toBe(false);
    });

    it('renders per-section error placeholders (graceful "—") when a count query fails', async () => {
        employeesIsError.value = true;
        pendingCountIsError.value = true;
        // Approver queue still loading — verify each section degrades
        // independently and the other sections still render.
        approverQueueIsLoading.value = true;

        const w = await mountPage();
        seedApprover();
        await w.vm.$nextTick();

        expect(w.find('[data-testid="hrm-dashboard-active-employees-error"]').text()).toBe('—');
        expect(w.find('[data-testid="hrm-dashboard-pending-lr-error"]').text()).toBe('—');
        expect(w.find('[data-testid="hrm-dashboard-approver-queue-loading"]').exists()).toBe(true);
    });

    it('LOAD-BEARING: approver-queue section is hidden entirely for users lacking hrm.leave_request.approve', async () => {
        // Whole card gone — not "empty rows" with a hidden list.
        // Non-approvers see counts only.
        employeesData.value = { meta: { total: 6 } };
        pendingCountData.value = { meta: { total: 2 } };

        const w = await mountPage();
        seedNonApprover();
        await w.vm.$nextTick();

        expect(w.find('[data-testid="hrm-dashboard-approver-queue-card"]').exists()).toBe(false);
        // Counts still render.
        expect(w.find('[data-testid="hrm-dashboard-active-employees-value"]').text()).toBe('6');
        expect(w.find('[data-testid="hrm-dashboard-pending-lr-value"]').text()).toBe('2');
    });
});
