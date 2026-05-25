import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue';

import type {
    LeaveRequest,
    LeaveRequestStatus,
} from '@/modules/hrm/types/leaveRequest';

// ─────────────────────────────────────────────────────────────────────────────
// useLeaveRequestDetailMode — pure derivation, no side effects.
//
// The DetailPage's centerpiece. It branches on a single mode at the
// top of the template into three named sub-templates. Modes are
// mutually exclusive — every (status, permissions) combination resolves
// to exactly one mode, and the consumer's exhaustive switch is the
// safety net for any future fourth mode.
//
// Modes:
//   - 'pending-can-decide' — row is pending AND the user has .approve.
//                            Detail renders with Approve + Reject buttons
//                            and (if .update) Edit / (if .delete) Delete.
//   - 'pending-no-decide'  — row is pending AND the user lacks .approve
//                            (they can view, possibly edit/delete, but
//                            cannot decide). Detail renders the explanatory
//                            "you can view but cannot decide" hint, plus
//                            whatever Edit/Delete the user has permissions
//                            for. No decision buttons.
//   - 'decided'            — row is approved OR rejected. Detail renders
//                            the populated approval block (decided-by
//                            summary, note). No Edit button (the backend
//                            would reject anyway, and surfacing it
//                            misleads). Delete still available if the
//                            user has permission — see edit/delete
//                            asymmetry note on the backend Actions.
//
// Pure: takes a LeaveRequest (the row) and a permissions snapshot
// (booleans), returns reactive derivations. No router, no toast, no
// query client, no fetch. Unit-testable in isolation against
// hand-crafted fixtures. The consumer (DetailPage) does the real-world
// integration — wires the auth store + leave-request query in, passes
// them as inputs, and uses the returned mode to drive the template
// branching at the TOP LEVEL (not interleaved v-ifs on individual
// buttons).
//
// Type-level note: returning `'pending-can-decide' | 'pending-no-decide'
// | 'decided'` as a discriminated literal means a future fourth mode
// is a TypeScript compile error in every consumer's exhaustive switch
// — caught at build time, not at runtime.
// ─────────────────────────────────────────────────────────────────────────────

export type LeaveRequestDetailMode =
    | 'pending-can-decide'
    | 'pending-no-decide'
    | 'decided';

export interface LeaveRequestDetailModeInput {
    /** The loaded row, or null while the query is in-flight / errored. */
    leaveRequest: MaybeRefOrGetter<LeaveRequest | null>;
    /** Whether the current user has hrm.leave_request.approve. */
    canApprove: MaybeRefOrGetter<boolean>;
    /** Whether the current user has hrm.leave_request.update. */
    canEdit: MaybeRefOrGetter<boolean>;
    /** Whether the current user has hrm.leave_request.delete. */
    canDelete: MaybeRefOrGetter<boolean>;
}

export interface LeaveRequestDetailModeResult {
    /**
     * The resolved mode. Null while leaveRequest is null (loading state)
     * — the consumer renders its loading template separately and doesn't
     * need a mode until data has arrived. Once leaveRequest is non-null,
     * mode resolves to one of the three literal values.
     */
    mode: ComputedRef<LeaveRequestDetailMode | null>;
    /**
     * Convenience predicates derived from mode + permissions, exposed so
     * the template doesn't have to recompute the same conditions inline.
     * These are derived once, not re-derived per template element.
     */
    showApproveReject: ComputedRef<boolean>;
    showEdit: ComputedRef<boolean>;
    showDelete: ComputedRef<boolean>;
    /**
     * True when the row is pending and the user lacks decision authority.
     * Surfaces the explanatory "you can view but cannot decide on this"
     * banner so the user understands why no Approve/Reject buttons appear.
     */
    showMissingDecisionPermissionHint: ComputedRef<boolean>;
    /** True when the row is in a terminal state (approved or rejected). */
    isDecided: ComputedRef<boolean>;
    /** The terminal status, or null when not yet decided. */
    decidedStatus: ComputedRef<LeaveRequestStatus | null>;
}

export function useLeaveRequestDetailMode(
    input: LeaveRequestDetailModeInput,
): LeaveRequestDetailModeResult {
    const row = computed<LeaveRequest | null>(() => toValue(input.leaveRequest));
    const canApprove = computed<boolean>(() => toValue(input.canApprove));
    const canEdit = computed<boolean>(() => toValue(input.canEdit));
    const canDelete = computed<boolean>(() => toValue(input.canDelete));

    const mode = computed<LeaveRequestDetailMode | null>(() => {
        const r = row.value;
        if (r === null) return null;
        if (r.status !== 'pending') return 'decided';
        return canApprove.value ? 'pending-can-decide' : 'pending-no-decide';
    });

    const isDecided = computed<boolean>(() => mode.value === 'decided');

    const decidedStatus = computed<LeaveRequestStatus | null>(() => {
        const r = row.value;
        if (r === null) return null;
        return r.status === 'pending' ? null : r.status;
    });

    // Approve/Reject visible ONLY in pending-can-decide mode. Even a
    // tenant_admin with full permissions doesn't see these on a decided
    // row — the buttons would be misleading (the backend rejects the
    // call, and the row's terminal state is the source of truth).
    const showApproveReject = computed<boolean>(
        () => mode.value === 'pending-can-decide',
    );

    // Edit visible ONLY on pending rows AND with .update permission.
    // Decided rows hide Edit even if the user has .update — the backend
    // UpdateLeaveRequestAction would 422 invalid_transition.
    const showEdit = computed<boolean>(
        () => canEdit.value && row.value !== null && row.value.status === 'pending',
    );

    // Delete visible whenever the user has .delete, regardless of status.
    // The "created in error" affordance survives the decision per the
    // backend's deliberate edit/delete asymmetry.
    const showDelete = computed<boolean>(
        () => canDelete.value && row.value !== null,
    );

    const showMissingDecisionPermissionHint = computed<boolean>(
        () => mode.value === 'pending-no-decide',
    );

    return {
        mode,
        showApproveReject,
        showEdit,
        showDelete,
        showMissingDecisionPermissionHint,
        isDecided,
        decidedStatus,
    };
}
