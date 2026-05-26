<script setup lang="ts">
import axios from 'axios';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRouter } from 'vue-router';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import CardSection from '@/shared/components/layout/CardSection.vue';
import LoadingState from '@/shared/components/state/LoadingState.vue';
import ErrorState from '@/shared/components/state/ErrorState.vue';
import StatusBadge, {
    type StatusSeverity,
} from '@/shared/components/data-display/StatusBadge.vue';
import DateDisplay from '@/shared/components/data-display/DateDisplay.vue';
import LeaveRequestDecisionDialog from '@/modules/hrm/components/LeaveRequestDecisionDialog.vue';
import {
    useApproveLeaveRequest,
    useDeleteLeaveRequest,
    useLeaveRequestQuery,
    useRejectLeaveRequest,
} from '@/modules/hrm/composables/useLeaveRequests';
import { useLeaveRequestDetailMode } from '@/modules/hrm/composables/useLeaveRequestDetailMode';
import { useLeaveRequestDateLabel } from '@/modules/hrm/composables/useLeaveRequestDateLabel';
import { HRM_ROUTES } from '@/modules/hrm/routes';
import type {
    LeaveRequestStatus,
    LeaveType,
} from '@/modules/hrm/types/leaveRequest';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';

// ─────────────────────────────────────────────────────────────────────────────
// LeaveRequestDetailPage — the slice's centerpiece.
//
// Single-state-machine source of truth: useLeaveRequestDetailMode.
// Template branches on `mode` at the TOP level into three named blocks:
//   pending-can-decide — show Approve + Reject + (Edit if .update) + (Delete if .delete)
//   pending-no-decide  — show explanatory hint + (Edit if .update) + (Delete if .delete)
//   decided            — show decision-by panel + (Delete if .delete); NO Edit
//
// No interleaved `v-if="mode === 'X' && ..."` on individual buttons —
// the composable exposes pre-derived booleans (showApproveReject,
// showEdit, showDelete, showMissingDecisionPermissionHint) so the
// chrome stays declarative.
//
// Approve/Reject flow:
//   1. Button click → openDialog('approve' | 'reject')
//   2. Dialog renders confirm + optional note Textarea
//   3. User confirms → mutation runs (loading state on the dialog)
//   4. On success: toast + dialog closes + query invalidation refetches
//      → row's status flips → composable's mode flips to 'decided'
//      → template re-renders without Approve/Reject buttons
//   5. On failure: dialog stays open with the typed note preserved so
//      the user can retry without re-typing
//   6. Race-condition (422 invalid_transition): toast warns "already
//      decided by someone else", dialog closes, refetch surfaces the
//      current state
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    id: number;
}
const props = defineProps<Props>();

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const { confirmDelete } = useAppConfirm();

const { data, isLoading, isError, error, refetch } = useLeaveRequestQuery(
    () => props.id,
);
const approveMutation = useApproveLeaveRequest();
const rejectMutation = useRejectLeaveRequest();
const deleteMutation = useDeleteLeaveRequest();

const leaveRequest = computed(() => data.value?.data ?? null);

const isNotFound = computed<boolean>(() => {
    if (!isError.value) return false;
    const err = error.value;
    if (axios.isAxiosError(err)) return err.response?.status === 404;
    return false;
});
const isGenericError = computed<boolean>(() => isError.value && !isNotFound.value);

// ─── Permissions ────────────────────────────────────────────────────────────
const canEdit = computed<boolean>(() => auth.can('hrm.leave_request.update'));
const canDelete = computed<boolean>(() => auth.can('hrm.leave_request.delete'));
const canApprove = computed<boolean>(() => auth.can('hrm.leave_request.approve'));

// ─── State-machine mode (single source of truth) ────────────────────────────
const {
    mode,
    showApproveReject,
    showEdit,
    showDelete,
    showMissingDecisionPermissionHint,
    isDecided,
    decidedStatus,
} = useLeaveRequestDetailMode({
    leaveRequest,
    canApprove,
    canEdit,
    canDelete,
});

// ─── Dates label — single source of truth for the "Dates" row ─────────────
// The composable handles all four variants (full_day single, full_day
// range, morning, afternoon) so the template doesn't branch inline.
const { label: datesLabel } = useLeaveRequestDateLabel(
    () =>
        leaveRequest.value
            ? {
                start_date: leaveRequest.value.start_date,
                end_date: leaveRequest.value.end_date,
                day_part: leaveRequest.value.day_part,
            }
            : null,
    t,
);

// ─── Visual helpers ─────────────────────────────────────────────────────────
function statusSeverity(status: LeaveRequestStatus): StatusSeverity {
    switch (status) {
        case 'pending':
            return 'warning';
        case 'approved':
            return 'success';
        case 'rejected':
            return 'danger';
    }
}
function statusLabel(status: LeaveRequestStatus): string {
    return t(`hrm.leaveRequest.status.${status}`);
}
function typeLabel(type: LeaveType): string {
    return t(`hrm.leaveRequest.type.${type}`);
}

// ─── Chrome ─────────────────────────────────────────────────────────────────
const pageTitle = computed<string>(() => {
    const lr = leaveRequest.value;
    if (!lr) return t('hrm.leaveRequest.breadcrumb.list');
    const employeeName = lr.employee?.full_name ?? t('hrm.leaveRequest.detail.noEmployee');
    return `${employeeName} — ${typeLabel(lr.leave_type)}`;
});

const breadcrumbs = computed(() => [
    {
        label: t('hrm.leaveRequest.breadcrumb.list'),
        to: { name: HRM_ROUTES.LEAVE_REQUEST_LIST },
    },
    {
        label: leaveRequest.value?.employee?.full_name ?? t('hrm.leaveRequest.breadcrumb.list'),
    },
]);

// Decided-summary line — "Approved by Manager User on May 24, 2026" or
// the no-actor variant when approver was deleted. Computed once so the
// template stays terse.
const decidedSummary = computed<string | null>(() => {
    const lr = leaveRequest.value;
    if (!lr || !lr.approval) return null;
    const approverName = lr.approval.approver?.name;
    const dateStr = new Date(lr.approval.approved_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const status = lr.status;
    if (status === 'approved') {
        return approverName
            ? t('hrm.leaveRequest.detail.decidedSummary.approved', { name: approverName, date: dateStr })
            : t('hrm.leaveRequest.detail.decidedSummary.approvedNoActor', { date: dateStr });
    }
    if (status === 'rejected') {
        return approverName
            ? t('hrm.leaveRequest.detail.decidedSummary.rejected', { name: approverName, date: dateStr })
            : t('hrm.leaveRequest.detail.decidedSummary.rejectedNoActor', { date: dateStr });
    }
    return null;
});

// ─── Navigation ─────────────────────────────────────────────────────────────
function navigateToList(): void {
    void router.push({ name: HRM_ROUTES.LEAVE_REQUEST_LIST });
}
function navigateToEdit(): void {
    if (!leaveRequest.value) return;
    void router.push({
        name: HRM_ROUTES.LEAVE_REQUEST_EDIT,
        params: { id: leaveRequest.value.id },
    });
}

// ─── Delete ─────────────────────────────────────────────────────────────────
function onDelete(): void {
    if (!leaveRequest.value) return;
    confirmDelete({
        message: t('hrm.leaveRequest.delete.confirmMessage'),
        acceptLabel: t('hrm.leaveRequest.delete.confirmAction'),
        onAccept: async () => {
            try {
                await deleteMutation.mutateAsync(leaveRequest.value!.id);
                toast.add({
                    severity: 'success',
                    summary: t('hrm.leaveRequest.delete.toast.success'),
                    life: 3000,
                });
                void router.push({ name: HRM_ROUTES.LEAVE_REQUEST_LIST });
            } catch {
                toast.add({
                    severity: 'error',
                    summary: t('hrm.leaveRequest.delete.toast.error'),
                    life: 4000,
                });
            }
        },
    });
}

// ─── Decide flow (dialog + mutation) ────────────────────────────────────────
const dialogMode = ref<'approve' | 'reject' | null>(null);
const dialogVisible = computed<boolean>(() => dialogMode.value !== null);
const dialogLoading = computed<boolean>(
    () => approveMutation.isPending.value || rejectMutation.isPending.value,
);

function openApproveDialog(): void {
    dialogMode.value = 'approve';
}
function openRejectDialog(): void {
    dialogMode.value = 'reject';
}
function closeDialog(): void {
    dialogMode.value = null;
}

async function onDecide(note: string | null): Promise<void> {
    const lr = leaveRequest.value;
    const mode = dialogMode.value;
    if (!lr || !mode) return;

    try {
        if (mode === 'approve') {
            await approveMutation.mutateAsync({ id: lr.id, payload: { note } });
            toast.add({
                severity: 'success',
                summary: t('hrm.leaveRequest.decide.toast.approvedSuccess'),
                life: 3000,
            });
        } else {
            await rejectMutation.mutateAsync({ id: lr.id, payload: { note } });
            toast.add({
                severity: 'success',
                summary: t('hrm.leaveRequest.decide.toast.rejectedSuccess'),
                life: 3000,
            });
        }
        closeDialog();
        // Composable + invalidation already triggers refetch via .all
        // invalidation in the mutation's onSuccess; explicit refetch
        // here is belt-and-suspenders to guarantee the detail pane
        // re-renders immediately even if the invalidation race-orders
        // unexpectedly.
        void refetch();
    } catch (e: unknown) {
        // Distinguish 422 invalid_transition from generic errors. The
        // transition case means the row changed under the user — toast
        // warns + refetch surfaces the current state. Other errors get
        // a generic toast and the dialog stays open with the typed note
        // preserved.
        if (axios.isAxiosError(e) && e.response?.status === 422) {
            const body = e.response.data as
                | { error_code?: string }
                | undefined;
            if (body && body.error_code === 'invalid_transition') {
                toast.add({
                    severity: 'warn',
                    summary: t('hrm.leaveRequest.decide.toast.alreadyDecidedTitle'),
                    detail: t('hrm.leaveRequest.decide.toast.alreadyDecidedDetail'),
                    life: 4000,
                });
                closeDialog();
                void refetch();
                return;
            }
        }
        toast.add({
            severity: 'error',
            summary:
                mode === 'approve'
                    ? t('hrm.leaveRequest.decide.toast.approvedError')
                    : t('hrm.leaveRequest.decide.toast.rejectedError'),
            life: 4000,
        });
        // Don't closeDialog() — preserve the user's typed note for retry.
    }
}
</script>

<template>
    <PageLayout width="narrow">
        <!-- Loading. -->
        <template v-if="isLoading">
            <PageHeader
                :title="t('hrm.leaveRequest.breadcrumb.list')"
                :breadcrumbs="[{ label: t('hrm.leaveRequest.breadcrumb.list'), to: { name: HRM_ROUTES.LEAVE_REQUEST_LIST } }]"
            />
            <LoadingState variant="detail" data-testid="leave-request-detail-loading" />
        </template>

        <!-- Not found. -->
        <template v-else-if="isNotFound">
            <PageHeader
                :title="t('hrm.leaveRequest.notFound.title')"
                :breadcrumbs="[{ label: t('hrm.leaveRequest.breadcrumb.list'), to: { name: HRM_ROUTES.LEAVE_REQUEST_LIST } }]"
            />
            <CardSection>
                <div
                    class="flex flex-col items-center gap-3 py-8 text-center"
                    data-testid="leave-request-detail-not-found"
                >
                    <i class="pi pi-compass text-5xl text-text-tertiary" aria-hidden="true"></i>
                    <h2 class="text-xl font-medium text-text-primary">
                        {{ t('hrm.leaveRequest.notFound.title') }}
                    </h2>
                    <p class="max-w-md text-base text-text-secondary">
                        {{ t('hrm.leaveRequest.notFound.description') }}
                    </p>
                    <Button
                        :label="t('hrm.leaveRequest.notFound.action')"
                        icon="pi pi-arrow-left"
                        severity="secondary"
                        class="mt-2"
                        data-testid="leave-request-detail-back-to-list"
                        @click="navigateToList"
                    />
                </div>
            </CardSection>
        </template>

        <!-- Generic error. -->
        <template v-else-if="isGenericError">
            <PageHeader
                :title="t('hrm.leaveRequest.breadcrumb.list')"
                :breadcrumbs="[{ label: t('hrm.leaveRequest.breadcrumb.list'), to: { name: HRM_ROUTES.LEAVE_REQUEST_LIST } }]"
            />
            <CardSection>
                <ErrorState data-testid="leave-request-detail-error" @retry="refetch" />
            </CardSection>
        </template>

        <!-- Populated — branch by mode at the TOP. Each mode's chrome
             buttons resolve from the composable's pre-derived booleans;
             no `v-if="mode === 'X' && condition"` interleaving. -->
        <template v-else-if="leaveRequest">
            <PageHeader
                :title="pageTitle"
                :breadcrumbs="breadcrumbs"
                :data-testid-mode="mode"
            >
                <template #actions>
                    <Button
                        v-if="showApproveReject"
                        :label="t('hrm.leaveRequest.detail.approve')"
                        icon="pi pi-check"
                        severity="success"
                        data-testid="leave-request-detail-approve-button"
                        @click="openApproveDialog"
                    />
                    <Button
                        v-if="showApproveReject"
                        :label="t('hrm.leaveRequest.detail.reject')"
                        icon="pi pi-times"
                        severity="danger"
                        data-testid="leave-request-detail-reject-button"
                        @click="openRejectDialog"
                    />
                    <Button
                        v-if="showEdit"
                        :label="t('hrm.leaveRequest.detail.edit')"
                        icon="pi pi-pencil"
                        severity="secondary"
                        data-testid="leave-request-detail-edit-button"
                        @click="navigateToEdit"
                    />
                    <Button
                        v-if="showDelete"
                        :label="t('hrm.leaveRequest.detail.delete')"
                        icon="pi pi-trash"
                        severity="danger"
                        :loading="deleteMutation.isPending.value"
                        data-testid="leave-request-detail-delete-button"
                        @click="onDelete"
                    />
                </template>
            </PageHeader>

            <!-- Mode-specific banner: hint for pending-no-decide users. -->
            <div
                v-if="showMissingDecisionPermissionHint"
                role="status"
                class="mb-4 rounded-md border border-warning bg-warning-bg px-3 py-2 text-sm text-warning-text"
                data-testid="leave-request-detail-missing-permission-hint"
            >
                <i class="pi pi-info-circle mr-2" aria-hidden="true"></i>
                {{ t('hrm.leaveRequest.detail.missingDecisionPermission') }}
            </div>

            <!-- Decision summary banner — only renders in decided mode. -->
            <div
                v-if="isDecided && decidedSummary"
                role="status"
                class="mb-4 rounded-md border px-3 py-2 text-sm"
                :class="
                    decidedStatus === 'approved'
                        ? 'border-success bg-success-bg text-success-text'
                        : 'border-danger bg-danger-bg text-danger-text'
                "
                data-testid="leave-request-detail-decided-summary"
            >
                <i
                    class="mr-2"
                    :class="decidedStatus === 'approved' ? 'pi pi-check-circle' : 'pi pi-times-circle'"
                    aria-hidden="true"
                ></i>
                {{ decidedSummary }}
            </div>

            <CardSection :title="t('hrm.leaveRequest.detail.sections.details')">
                <dl class="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.leaveRequest.detail.fields.employee') }}
                        </dt>
                        <dd
                            class="mt-1 text-base"
                            data-testid="leave-request-detail-employee"
                        >
                            <RouterLink
                                v-if="leaveRequest.employee"
                                :to="{
                                    name: HRM_ROUTES.EMPLOYEE_DETAIL,
                                    params: { id: leaveRequest.employee.id },
                                }"
                                class="text-brand hover:underline focus:outline-none focus:underline"
                                :data-testid="`leave-request-detail-employee-link-${leaveRequest.employee.id}`"
                            >
                                {{ leaveRequest.employee.full_name }}
                                <span class="ml-2 text-xs text-text-tertiary tabular-nums">
                                    {{ leaveRequest.employee.employee_code }}
                                </span>
                            </RouterLink>
                            <span v-else class="text-text-tertiary italic">
                                {{ t('hrm.leaveRequest.detail.noEmployee') }}
                            </span>
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.leaveRequest.detail.fields.type') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="leave-request-detail-type"
                        >
                            {{ typeLabel(leaveRequest.leave_type) }}
                        </dd>
                    </div>

                    <!-- Single "Dates" row driven by useLeaveRequestDateLabel.
                         Adapts to (start, end, day_part):
                           full_day single  → "Fri, May 22"
                           full_day range   → "Fri, May 22 → Fri, May 26"
                           morning          → "Fri, May 22 (Morning)"
                           afternoon        → "Fri, May 22 (Afternoon)"
                         Replaces the previous separate Start/End rows so
                         the half-day case isn't misrepresented as a
                         one-day "range". -->
                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.leaveRequest.detail.fields.dates') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="leave-request-detail-dates"
                        >
                            {{ datesLabel }}
                        </dd>
                    </div>

                    <!-- Days requested — calendar-day count derived
                         server-side from dates + day_part. Surfaced
                         here so a curious user can see at a glance
                         that a half-day morning request consumed 0.5
                         (without that label, "0.5" reads as a
                         placeholder error). The Leave Balances slice
                         will aggregate this same value. -->
                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.leaveRequest.detail.fields.daysCount') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary tabular-nums"
                            data-testid="leave-request-detail-days-count"
                        >
                            {{ t('hrm.leaveRequest.detail.daysCountValue', { n: leaveRequest.days_count }) }}
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.leaveRequest.detail.fields.status') }}
                        </dt>
                        <dd class="mt-1" data-testid="leave-request-detail-status">
                            <StatusBadge
                                :severity="statusSeverity(leaveRequest.status)"
                                :label="statusLabel(leaveRequest.status)"
                            />
                        </dd>
                    </div>

                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.leaveRequest.detail.fields.createdAt') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="leave-request-detail-created-at"
                        >
                            <DateDisplay :date="leaveRequest.created_at" format="short" />
                        </dd>
                    </div>

                    <div class="sm:col-span-2">
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.leaveRequest.detail.fields.reason') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary whitespace-pre-wrap"
                            data-testid="leave-request-detail-reason"
                        >
                            <span v-if="leaveRequest.reason">{{ leaveRequest.reason }}</span>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.leaveRequest.detail.noReason') }}
                            </span>
                        </dd>
                    </div>
                </dl>
            </CardSection>

            <!-- Decision card — populated only on decided rows. Distinct
                 from the inline banner above: this is the full
                 chronological record (date, approver, note) shown in a
                 card alongside the details, not just a one-line summary. -->
            <CardSection
                v-if="isDecided && leaveRequest.approval"
                :title="t('hrm.leaveRequest.detail.sections.decision')"
            >
                <dl class="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.leaveRequest.detail.fields.decidedAt') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="leave-request-detail-decided-at"
                        >
                            <DateDisplay :date="leaveRequest.approval.approved_at" format="long" />
                        </dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.leaveRequest.detail.fields.decidedBy') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary"
                            data-testid="leave-request-detail-decided-by"
                        >
                            <span v-if="leaveRequest.approval.approver">
                                {{ leaveRequest.approval.approver.name }}
                            </span>
                            <span v-else class="text-text-tertiary italic">
                                {{ t('hrm.leaveRequest.detail.deletedApprover') }}
                            </span>
                        </dd>
                    </div>
                    <div class="sm:col-span-2">
                        <dt class="text-sm font-medium text-text-secondary">
                            {{ t('hrm.leaveRequest.detail.fields.decisionNote') }}
                        </dt>
                        <dd
                            class="mt-1 text-base text-text-primary whitespace-pre-wrap"
                            data-testid="leave-request-detail-decision-note"
                        >
                            <span v-if="leaveRequest.approval.note">{{ leaveRequest.approval.note }}</span>
                            <span v-else class="text-text-tertiary">
                                {{ t('hrm.leaveRequest.detail.noNote') }}
                            </span>
                        </dd>
                    </div>
                </dl>
            </CardSection>

            <!-- The decision dialog — single instance, mode prop switches
                 approve vs reject behavior. visible is driven by
                 dialogMode (null = closed). -->
            <LeaveRequestDecisionDialog
                v-if="dialogMode"
                :visible="dialogVisible"
                :mode="dialogMode"
                :leave-request="leaveRequest"
                :loading="dialogLoading"
                @cancel="closeDialog"
                @confirm="onDecide"
            />
        </template>
    </PageLayout>
</template>
