import { useConfirm } from 'primevue/useconfirm';
import { useI18n } from 'vue-i18n';

// ─────────────────────────────────────────────────────────────────────────────
// useAppConfirm — wrapper around PrimeVue's useConfirm() with our conventions.
//
// Two helpers:
//   confirmDelete  — danger severity, "Delete" / "Cancel" defaults (i18n keys),
//                    focus on Cancel (safer for destructive actions).
//   confirmAction  — caller picks severity, accept label, etc. for non-
//                    destructive but consequential operations (e.g. reverse
//                    journal entry, archive employee).
//
// Both helpers require a singleton <AppConfirmDialog /> mounted somewhere
// upstream in the app (mounted in App.vue per F2 master plan decision G).
//
// Reject callback is optional (master plan decision #19). Most consumers
// don't care about cancel — only that the user proceeded.
// ─────────────────────────────────────────────────────────────────────────────

export type ConfirmSeverity = 'danger' | 'warning' | 'info';

export interface ConfirmDeleteOptions {
    message: string;
    detail?: string;
    acceptLabel?: string;
    onAccept: () => void | Promise<void>;
    onReject?: () => void;
}

export interface ConfirmActionOptions {
    message: string;
    detail?: string;
    severity?: ConfirmSeverity;
    acceptLabel?: string;
    rejectLabel?: string;
    onAccept: () => void | Promise<void>;
    onReject?: () => void;
}

const SEVERITY_ICON: Record<ConfirmSeverity, string> = {
    danger: 'pi pi-exclamation-triangle',
    warning: 'pi pi-exclamation-circle',
    info: 'pi pi-info-circle',
};

const SEVERITY_ACCEPT_CLASS: Record<ConfirmSeverity, string> = {
    danger: 'p-button-danger',
    warning: 'p-button-warn',
    info: '',
};

export function useAppConfirm() {
    const confirm = useConfirm();
    const { t } = useI18n();

    function confirmDelete(opts: ConfirmDeleteOptions): void {
        confirm.require({
            message: opts.message,
            // Combine detail into a single message body if provided — PV
            // ConfirmDialog renders `message` and ignores ad-hoc detail keys.
            ...(opts.detail ? { message: `${opts.message}\n\n${opts.detail}` } : {}),
            icon: SEVERITY_ICON.danger,
            acceptLabel: opts.acceptLabel ?? t('common.confirm.delete'),
            rejectLabel: t('common.confirm.cancel'),
            acceptClass: SEVERITY_ACCEPT_CLASS.danger,
            defaultFocus: 'reject',
            accept: opts.onAccept,
            reject: opts.onReject,
        });
    }

    function confirmAction(opts: ConfirmActionOptions): void {
        const severity = opts.severity ?? 'info';
        confirm.require({
            message: opts.message,
            ...(opts.detail ? { message: `${opts.message}\n\n${opts.detail}` } : {}),
            icon: SEVERITY_ICON[severity],
            acceptLabel: opts.acceptLabel ?? t('common.confirm.confirm'),
            rejectLabel: opts.rejectLabel ?? t('common.confirm.cancel'),
            acceptClass: SEVERITY_ACCEPT_CLASS[severity],
            defaultFocus: 'reject',
            accept: opts.onAccept,
            reject: opts.onReject,
        });
    }

    return { confirmDelete, confirmAction };
}
