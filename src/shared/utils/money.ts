// ─────────────────────────────────────────────────────────────────────────────
// Money utilities.
//
// CLAUDE.md §3 mandates BCMath scale-4 strings as the money interchange format.
// Floats are banned in money code paths — not just for math (which is the
// obvious failure), but also for FORMATTING (which is the invisible one:
// parseFloat silently loses precision above ~15 significant figures; an
// ERP-scale consolidated KHR balance prints a slightly wrong number with no
// error and no test catches it).
//
// All functions here operate on strings end-to-end. BigInt is used internally
// for exact integer arithmetic; the fractional portion is spliced back in via
// the locale's decimal separator. Negative operands throw — add support when
// a real consumer needs it.
// ─────────────────────────────────────────────────────────────────────────────

const POSITIVE_BCMATH = /^\d+(\.\d+)?$/;

/**
 * Format a BCMath money string for display with currency symbol + locale-aware
 * thousand separators and decimal separator.
 *
 *   formatMoney('123456789012.4567', 'USD', 'en-US')
 *     === '$123,456,789,012.4567'
 *   formatMoney('1234.56', 'EUR', 'de-DE')
 *     === '1.234,56 €'
 *
 * Throws on negative or malformed input (loud over silent — financial code).
 */
export function formatMoney(amount: string, currency: string, locale = 'en-US'): string {
    if (amount.startsWith('-')) {
        throw new Error(
            `formatMoney does not yet support negative amounts (got ${JSON.stringify(amount)}). ` +
                'Add support when a consumer needs it.',
        );
    }
    if (!POSITIVE_BCMATH.test(amount)) {
        throw new Error(`formatMoney: invalid BCMath amount: ${JSON.stringify(amount)}`);
    }

    const [intPart, fracPart = ''] = amount.split('.');
    const intBig = BigInt(intPart);

    // Locale-aware decimal separator. en-US ".", fr-FR / de-DE ",", etc.
    const decimalSep = new Intl.NumberFormat(locale)
        .formatToParts(1.1)
        .find((p) => p.type === 'decimal')?.value ?? '.';

    // Pad fraction to ≥2 digits (currency convention) or its actual length.
    const paddedFrac = fracPart.padEnd(Math.max(2, fracPart.length), '0');

    // Currency-style format on the integer BigInt with zero fraction digits.
    // BigInt is exact at any magnitude; this is the BigInt-splice escape from
    // parseFloat's precision ceiling.
    const intParts = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).formatToParts(intBig);

    // Find the last integer/group part; insert decimal + fraction right after.
    // This handles both prefix-symbol locales (en-US: $X.YZ) and suffix-symbol
    // locales (de-DE: X,YZ €).
    let lastIntegerIdx = -1;
    for (let i = 0; i < intParts.length; i++) {
        if (intParts[i].type === 'integer' || intParts[i].type === 'group') {
            lastIntegerIdx = i;
        }
    }

    let result = '';
    for (let i = 0; i < intParts.length; i++) {
        result += intParts[i].value;
        if (i === lastIntegerIdx) {
            result += decimalSep + paddedFrac;
        }
    }
    return result;
}

/**
 * Add two positive BCMath money strings at fixed scale (default 4).
 * Result is always at the given scale (zero-padded fraction).
 *
 *   moneyAdd('0.1', '0.2')                  === '0.3000'
 *   moneyAdd('1234567890.1234', '9.5678')   === '1234567899.6912'
 *
 * Throws on negative operands or invalid input.
 */
export function moneyAdd(a: string, b: string, scale = 4): string {
    for (const op of [a, b]) {
        if (op.startsWith('-')) {
            throw new Error(
                `moneyAdd does not yet support negative operands (got ${JSON.stringify(op)}). ` +
                    'Add support when a consumer needs it.',
            );
        }
        if (!POSITIVE_BCMATH.test(op)) {
            throw new Error(`moneyAdd: invalid operand: ${JSON.stringify(op)}`);
        }
    }

    const toScaled = (s: string): bigint => {
        const [i, f = ''] = s.split('.');
        const fAtScale = f.padEnd(scale, '0').slice(0, scale);
        return BigInt(i + fAtScale);
    };

    const sum = toScaled(a) + toScaled(b);
    const sumStr = sum.toString().padStart(scale + 1, '0');
    return `${sumStr.slice(0, -scale)}.${sumStr.slice(-scale)}`;
}
