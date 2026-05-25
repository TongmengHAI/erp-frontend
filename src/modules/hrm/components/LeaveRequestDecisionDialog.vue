<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';

import type {
    LeaveRequest,
    LeaveType,
} from '@/modules/hrm/types/leaveRequest';

// ─────────────────────────────────────────────────────────────────────────────
// LeaveRequestDecisionDialog — parameterized confirm dialog for both
// approve and reject. One component, mode prop ('approve' | 'reject')
// switches the titles, message, button labels, and severity.
//
// The note Textarea lives INSIDE the dialog (not on the page chrome).
// Rationale: the note is decision-scoped — it's conceptually part of the
// "I am deciding this now" act, not a free-floating page field. Surfacing
// it on the page chrome would create the question "what happens to my
// note if I don't confirm?" The in-dialog placement makes the
// "type-note → confirm → mutation runs with that note" flow obvious.
//
// The dialog emits a single `confirm(note)` event. The parent (DetailPage)
// wires the mutation, the toast, and the refetch — the dialog has no
// knowledge of TanStack Query or the mutation API. Keeping the dialog
// presentational makes it reusable for any future workflow that needs a
// "confirm with optional note" pattern.
//
// Loading state is parent-controlled via the `loading` prop — while the
// mutation is in-flight the dialog disables Confirm + the Textarea so a
// double-click doesn't fire two requests. The parent doesn't close the
// dialog itself; the dialog closes on its own onSuccess (in handleConfirm
// — but only AFTER the mutation resolves, which is when `loading` drops
// back to false).
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    visible: boolean;
    mode: 'approve' | 'reject';
    leaveRequest: LeaveRequest;
    loading: boolean;
}
const props = defineProps<Props>();

const emit = defineEmits<{
    /** User clicked Cancel or the X button. Parent should set visible=false. */
    (e: 'cancel'): void;
    /**
     * User clicked Confirm. Parent runs the mutation, then resets
     * `loading` AND `visible` based on success/failure (the dialog
     * stays open on error so the user can retry without re-typing
     * the note).
     */
    (e: 'confirm', note: string | null): void;
}>();

const { t } = useI18n();

const note = ref<string>('');

// Reset the note field whenever the dialog is opened anew. Without
// this, closing-then-reopening leaves stale text behind, which is
// surprising — the user thinks they're starting fresh.
watch(
    () => props.visible,
    (isOpen) => {
        if (isOpen) note.value = '';
    },
);

const title = computed<string>(() =>
    props.mode === 'approve'
        ? t('hrm.leaveRequest.decide.approveTitle')
        : t('hrm.leaveRequest.decide.rejectTitle'),
);

const confirmLabel = computed<string>(() =>
    props.mode === 'approve'
        ? t('hrm.leaveRequest.decide.approveConfirm')
        : t('hrm.leaveRequest.decide.rejectConfirm'),
);

const confirmSeverity = computed<'success' | 'danger'>(() =>
    props.mode === 'approve' ? 'success' : 'danger',
);

const confirmIcon = computed<string>(() =>
    props.mode === 'approve' ? 'pi pi-check' : 'pi pi-times',
);

const employeeName = computed<string>(
    () =>
        props.leaveRequest.employee?.full_name ??
        t('hrm.leaveRequest.detail.noEmployee'),
);

function typeLabel(type: LeaveType): string {
    return t(`hrm.leaveRequest.type.${type}`);
}

const message = computed<string>(() => {
    const key =
        props.mode === 'approve'
            ? 'hrm.leaveRequest.decide.approveMessage'
            : 'hrm.leaveRequest.decide.rejectMessage';
    return t(key, {
        employee: employeeName.value,
        type: typeLabel(props.leaveRequest.leave_type),
        from: props.leaveRequest.start_date,
        to: props.leaveRequest.end_date,
    });
});

function onCancel(): void {
    emit('cancel');
}

function onConfirm(): void {
    // Empty string → null on the wire. Backend's
    // ApproveLeaveRequestRequest/RejectLeaveRequestRequest accepts
    // `note` as nullable; the trimmed-empty case is conceptually "no
    // note", not "a note containing nothing."
    const trimmed = note.value.trim();
    emit('confirm', trimmed === '' ? null : trimmed);
}

// Surface a max-length hint matching the backend's 500-char cap. The
// Textarea has `maxlength`, so the cap is enforced at input time; the
// `?: too long` 422 path is defensive in case a paste exceeds it
// (PrimeVue Textarea honors maxlength).
const MAX_NOTE_LEN = 500;
</script>

<template>
    <Dialog
        :visible="visible"
        :header="title"
        :modal="true"
        :closable="!loading"
        :draggable="false"
        :style="{ width: '32rem' }"
        :pt="{ root: { 'data-testid': 'leave-request-decision-dialog' } }"
        @update:visible="(v: boolean) => !v && onCancel()"
    >
        <div class="flex flex-col gap-4">
            <p class="text-sm text-text-secondary" data-testid="leave-request-decision-dialog-message">
                {{ message }}
            </p>

            <div class="flex flex-col gap-1">
                <label
                    for="leave-request-decision-note"
                    class="text-sm font-medium text-text-primary"
                >
                    {{ t('hrm.leaveRequest.decide.noteLabel') }}
                </label>
                <Textarea
                    id="leave-request-decision-note"
                    v-model="note"
                    rows="3"
                    :maxlength="MAX_NOTE_LEN"
                    :placeholder="t('hrm.leaveRequest.decide.notePlaceholder')"
                    :disabled="loading"
                    auto-resize
                    class="w-full"
                    data-testid="leave-request-decision-dialog-note"
                />
                <p class="text-xs text-text-tertiary">
                    {{ t('hrm.leaveRequest.decide.noteHelp') }}
                </p>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2">
                <Button
                    :label="t('hrm.leaveRequest.decide.cancel')"
                    severity="secondary"
                    :disabled="loading"
                    data-testid="leave-request-decision-dialog-cancel"
                    @click="onCancel"
                />
                <Button
                    :label="confirmLabel"
                    :icon="confirmIcon"
                    :severity="confirmSeverity"
                    :loading="loading"
                    data-testid="leave-request-decision-dialog-confirm"
                    @click="onConfirm"
                />
            </div>
        </template>
    </Dialog>
</template>
