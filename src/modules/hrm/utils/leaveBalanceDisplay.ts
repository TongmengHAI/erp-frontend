import type { ComposerTranslation } from 'vue-i18n';

// ─────────────────────────────────────────────────────────────────────────────
// LOAD-BEARING: Leave Balance over-consumed labeling helpers.
//
// Wire format for `remaining_days` is a SIGNED number — negative values
// indicate over-consumption (intentional, not a bug). The UI MUST label
// the negative case explicitly so a user sees "Over-consumed by 2 days"
// rather than a bare "-2" that reads as a placeholder error.
//
// Three states matter visually:
//   • remaining >= 1   → healthy   (green, "N days remaining")
//   • remaining == 0   → exact     (neutral, "0 days remaining" — NOT a
//                                   warning; using all of your leave is
//                                   intentional, valid behavior)
//   • remaining < 0    → over      (danger, "Over-consumed by N days")
//
// Threshold logic is `>= 1`, `== 0`, `< 0` — NOT `> 0`, `<= 0`. The
// difference is whether 0 reads as healthy or warning. The seeded
// E-1002 annual case (allocated 10, consumed 10, remaining 0) is the
// visual proof that 0 must be neutral.
//
// Same helper used in three places:
//   • LeaveBalanceListPage's `cell-remaining_days`
//   • LeaveBalanceDetailPage's primary display
//   • EmployeeLeaveBalancesCard (Session 3)
//
// Centralising the threshold + the copy means a copy change in en.json
// ripples to every consumer; centralising the threshold logic means
// the >= 1 / == 0 / < 0 split can never drift between surfaces.
// ─────────────────────────────────────────────────────────────────────────────

export type BalanceSeverity = 'success' | 'neutral' | 'danger';

/**
 * Classify the remaining-days state into one of the three visual
 * buckets. Used by every UI surface that displays a balance.
 */
export function balanceSeverity(remainingDays: number): BalanceSeverity {
    if (remainingDays >= 1) return 'success';
    if (remainingDays === 0) return 'neutral';
    return 'danger';
}

/**
 * Return the user-facing label for a `remaining_days` value. Routes
 * through i18n so plural-aware copy + future Khmer translation work
 * without touching every callsite.
 *
 * Three i18n keys used (defined in en.json under hrm.leaveBalance.display):
 *   • daysRemaining       — positive case, "{n} days remaining"
 *   • zeroRemainingLabel  — exact-zero case, "0 days remaining" (NOT pluralised)
 *   • overConsumedLabel   — negative case, "Over-consumed by {n} days"
 *
 * The negative case passes Math.abs(remaining) as n so the copy reads
 * naturally ("Over-consumed by 2 days", not "Over-consumed by -2 days").
 */
export function formatRemainingDays(remainingDays: number, t: ComposerTranslation): string {
    if (remainingDays < 0) {
        return t('hrm.leaveBalance.display.overConsumedLabel', Math.abs(remainingDays), {
            named: { n: Math.abs(remainingDays) },
        });
    }
    if (remainingDays === 0) {
        return t('hrm.leaveBalance.display.zeroRemainingLabel');
    }
    return t('hrm.leaveBalance.display.daysRemaining', remainingDays, {
        named: { n: remainingDays },
    });
}
