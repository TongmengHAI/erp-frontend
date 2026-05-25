import { describe, expect, it } from 'vitest';
import { ref } from 'vue';

import { useLeaveRequestDetailMode } from '@/modules/hrm/composables/useLeaveRequestDetailMode';
import type { LeaveRequest } from '@/modules/hrm/types/leaveRequest';

// ─────────────────────────────────────────────────────────────────────────────
// useLeaveRequestDetailMode — pure-function tests.
//
// The composable returns reactive derivations based on (row, permissions).
// Every (status × permissions) combination resolves to a single mode;
// these tests pin the matrix so a refactor can't silently flip a cell.
//
// Matrix:
//                            | .approve  | !.approve
//   ----------------------------+-----------+-----------
//   status=pending             | pending-can-decide | pending-no-decide
//   status=approved/rejected    | decided   | decided
//
// Plus null row → mode null (loading state).
// Plus the secondary derivations (showApproveReject, showEdit, showDelete,
// showMissingDecisionPermissionHint, isDecided, decidedStatus) for the
// load-bearing rules:
//   - Approve/Reject buttons NEVER visible on decided rows
//   - Edit button NEVER visible on decided rows (even with .update)
//   - Delete button visible whenever .delete (the edit/delete asymmetry)
//   - Hint visible only in pending-no-decide
// ─────────────────────────────────────────────────────────────────────────────

function fixture(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
    return {
        id: 1,
        employee: { id: 1, employee_code: 'E-1001', full_name: 'Sokha Chan' },
        leave_type: 'annual',
        start_date: '2026-06-15',
        end_date: '2026-06-19',
        reason: 'Family event.',
        status: 'pending',
        approval: null,
        created_at: '2026-05-24T10:00:00+00:00',
        updated_at: '2026-05-24T10:00:00+00:00',
        ...overrides,
    };
}

describe('useLeaveRequestDetailMode', () => {
    describe('mode derivation', () => {
        it('returns null mode when the row is null (loading state)', () => {
            const { mode } = useLeaveRequestDetailMode({
                leaveRequest: null,
                canApprove: true,
                canEdit: true,
                canDelete: true,
            });
            expect(mode.value).toBeNull();
        });

        it('resolves to "pending-can-decide" when row is pending AND user has .approve', () => {
            const { mode } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'pending' }),
                canApprove: true,
                canEdit: true,
                canDelete: true,
            });
            expect(mode.value).toBe('pending-can-decide');
        });

        it('resolves to "pending-no-decide" when row is pending AND user lacks .approve', () => {
            const { mode } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'pending' }),
                canApprove: false,
                canEdit: true,
                canDelete: true,
            });
            expect(mode.value).toBe('pending-no-decide');
        });

        it('resolves to "decided" when row is approved (regardless of permissions)', () => {
            const { mode } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'approved' }),
                canApprove: true,
                canEdit: true,
                canDelete: true,
            });
            expect(mode.value).toBe('decided');
        });

        it('resolves to "decided" when row is rejected (regardless of permissions)', () => {
            const { mode } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'rejected' }),
                canApprove: true,
                canEdit: true,
                canDelete: true,
            });
            expect(mode.value).toBe('decided');
        });

        it('a user with .approve still gets "decided" mode on a rejected row — terminal states are terminal', () => {
            // The mode reflects the row's state, not what the user could do
            // if the row were still pending. Even a manager sees a decided
            // row as decided.
            const { mode, showApproveReject } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'rejected' }),
                canApprove: true,
                canEdit: true,
                canDelete: true,
            });
            expect(mode.value).toBe('decided');
            expect(showApproveReject.value).toBe(false);
        });
    });

    describe('showApproveReject — LOAD-BEARING: never visible on decided rows', () => {
        it('is true in pending-can-decide mode', () => {
            const { showApproveReject } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'pending' }),
                canApprove: true,
                canEdit: false,
                canDelete: false,
            });
            expect(showApproveReject.value).toBe(true);
        });

        it('is false in pending-no-decide mode', () => {
            const { showApproveReject } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'pending' }),
                canApprove: false,
                canEdit: true,
                canDelete: true,
            });
            expect(showApproveReject.value).toBe(false);
        });

        it('is false on an approved row even with .approve', () => {
            const { showApproveReject } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'approved' }),
                canApprove: true,
                canEdit: true,
                canDelete: true,
            });
            expect(showApproveReject.value).toBe(false);
        });

        it('is false on a rejected row even with .approve', () => {
            const { showApproveReject } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'rejected' }),
                canApprove: true,
                canEdit: true,
                canDelete: true,
            });
            expect(showApproveReject.value).toBe(false);
        });
    });

    describe('showEdit — LOAD-BEARING: hidden on decided rows even with .update', () => {
        it('is true on a pending row with .update', () => {
            const { showEdit } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'pending' }),
                canApprove: true,
                canEdit: true,
                canDelete: false,
            });
            expect(showEdit.value).toBe(true);
        });

        it('is false on a pending row without .update', () => {
            const { showEdit } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'pending' }),
                canApprove: true,
                canEdit: false,
                canDelete: true,
            });
            expect(showEdit.value).toBe(false);
        });

        it('is false on an approved row WITH .update — backend would 422 invalid_transition', () => {
            const { showEdit } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'approved' }),
                canApprove: true,
                canEdit: true,
                canDelete: true,
            });
            expect(showEdit.value).toBe(false);
        });

        it('is false on a rejected row WITH .update', () => {
            const { showEdit } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'rejected' }),
                canApprove: true,
                canEdit: true,
                canDelete: true,
            });
            expect(showEdit.value).toBe(false);
        });
    });

    describe('showDelete — LOAD-BEARING: visible whenever .delete (edit/delete asymmetry)', () => {
        it('is true on a pending row with .delete', () => {
            const { showDelete } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'pending' }),
                canApprove: false,
                canEdit: false,
                canDelete: true,
            });
            expect(showDelete.value).toBe(true);
        });

        it('is true on an approved row with .delete — the "created in error" affordance', () => {
            const { showDelete } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'approved' }),
                canApprove: false,
                canEdit: false,
                canDelete: true,
            });
            expect(showDelete.value).toBe(true);
        });

        it('is true on a rejected row with .delete', () => {
            const { showDelete } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'rejected' }),
                canApprove: false,
                canEdit: false,
                canDelete: true,
            });
            expect(showDelete.value).toBe(true);
        });

        it('is false when the user lacks .delete (regardless of status)', () => {
            const { showDelete } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'approved' }),
                canApprove: true,
                canEdit: true,
                canDelete: false,
            });
            expect(showDelete.value).toBe(false);
        });

        it('is false when the row is null (no row to delete)', () => {
            const { showDelete } = useLeaveRequestDetailMode({
                leaveRequest: null,
                canApprove: true,
                canEdit: true,
                canDelete: true,
            });
            expect(showDelete.value).toBe(false);
        });
    });

    describe('showMissingDecisionPermissionHint — visible only in pending-no-decide', () => {
        it('is true in pending-no-decide mode', () => {
            const { showMissingDecisionPermissionHint } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'pending' }),
                canApprove: false,
                canEdit: true,
                canDelete: true,
            });
            expect(showMissingDecisionPermissionHint.value).toBe(true);
        });

        it('is false in pending-can-decide mode', () => {
            const { showMissingDecisionPermissionHint } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'pending' }),
                canApprove: true,
                canEdit: true,
                canDelete: true,
            });
            expect(showMissingDecisionPermissionHint.value).toBe(false);
        });

        it('is false in decided mode (no point telling a user they cannot decide on a row that is already decided)', () => {
            const { showMissingDecisionPermissionHint } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'approved' }),
                canApprove: false,
                canEdit: false,
                canDelete: false,
            });
            expect(showMissingDecisionPermissionHint.value).toBe(false);
        });
    });

    describe('isDecided + decidedStatus', () => {
        it('isDecided=false and decidedStatus=null on a pending row', () => {
            const { isDecided, decidedStatus } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'pending' }),
                canApprove: true,
                canEdit: true,
                canDelete: true,
            });
            expect(isDecided.value).toBe(false);
            expect(decidedStatus.value).toBeNull();
        });

        it('isDecided=true and decidedStatus="approved" on an approved row', () => {
            const { isDecided, decidedStatus } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'approved' }),
                canApprove: false,
                canEdit: false,
                canDelete: false,
            });
            expect(isDecided.value).toBe(true);
            expect(decidedStatus.value).toBe('approved');
        });

        it('isDecided=true and decidedStatus="rejected" on a rejected row', () => {
            const { isDecided, decidedStatus } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'rejected' }),
                canApprove: false,
                canEdit: false,
                canDelete: false,
            });
            expect(isDecided.value).toBe(true);
            expect(decidedStatus.value).toBe('rejected');
        });

        it('isDecided=false and decidedStatus=null when row is null', () => {
            const { isDecided, decidedStatus } = useLeaveRequestDetailMode({
                leaveRequest: null,
                canApprove: true,
                canEdit: true,
                canDelete: true,
            });
            expect(isDecided.value).toBe(false);
            expect(decidedStatus.value).toBeNull();
        });
    });

    describe('reactivity — derivations re-compute when inputs change', () => {
        it('flips mode pending-can-decide → decided when status updates via ref', () => {
            const row = ref<LeaveRequest>(fixture({ status: 'pending' }));
            const { mode, showApproveReject } = useLeaveRequestDetailMode({
                leaveRequest: row,
                canApprove: true,
                canEdit: true,
                canDelete: true,
            });
            expect(mode.value).toBe('pending-can-decide');
            expect(showApproveReject.value).toBe(true);

            // Simulate the post-approve refetch — the row's status flips.
            row.value = { ...row.value, status: 'approved' };

            expect(mode.value).toBe('decided');
            expect(showApproveReject.value).toBe(false);
        });

        it('flips mode pending-can-decide → pending-no-decide when .approve revokes', () => {
            const canApprove = ref(true);
            const { mode } = useLeaveRequestDetailMode({
                leaveRequest: fixture({ status: 'pending' }),
                canApprove,
                canEdit: true,
                canDelete: true,
            });
            expect(mode.value).toBe('pending-can-decide');

            canApprove.value = false;

            expect(mode.value).toBe('pending-no-decide');
        });
    });
});
