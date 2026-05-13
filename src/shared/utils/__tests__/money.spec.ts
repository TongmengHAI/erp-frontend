import { describe, expect, it } from 'vitest';

import { formatMoney, moneyAdd } from '../money';

describe('formatMoney', () => {
    it('formats basic USD at en-US locale', () => {
        expect(formatMoney('1234.56', 'USD', 'en-US')).toBe('$1,234.56');
    });

    it('formats scale-4 amount preserving all fraction digits', () => {
        expect(formatMoney('123.4567', 'USD', 'en-US')).toBe('$123.4567');
    });

    it('zero amount still pads to currency minimum (2 digits)', () => {
        expect(formatMoney('0', 'USD', 'en-US')).toBe('$0.00');
        expect(formatMoney('0.0000', 'USD', 'en-US')).toBe('$0.0000');
    });

    // The headline test: parseFloat would silently lose precision here.
    // BigInt-splicing returns the exact digits regardless of magnitude.
    it('is exact at 15+ significant figures (the parseFloat trap)', () => {
        expect(formatMoney('123456789012.4567', 'USD', 'en-US')).toBe('$123,456,789,012.4567');
    });

    it('handles even larger magnitudes (consolidated KHR-scale figures)', () => {
        expect(formatMoney('9999999999999999.1234', 'USD', 'en-US')).toBe(
            '$9,999,999,999,999,999.1234',
        );
    });

    it('formats EUR at de-DE locale with European separators and trailing symbol', () => {
        // de-DE: dot as thousand separator, comma as decimal, currency at end.
        const result = formatMoney('1234567.89', 'EUR', 'de-DE');
        expect(result).toContain('1.234.567');
        expect(result).toContain(',89');
        expect(result).toContain('€');
    });

    it('formats KHR', () => {
        // KHR has no fractional unit in practice but Intl handles it.
        const result = formatMoney('50000.0000', 'KHR', 'en-US');
        expect(result).toContain('50,000');
    });

    it('throws on negative amount', () => {
        expect(() => formatMoney('-1.00', 'USD')).toThrow(/negative/);
    });

    it('throws on malformed input', () => {
        expect(() => formatMoney('abc', 'USD')).toThrow(/invalid BCMath/);
        expect(() => formatMoney('1.2.3', 'USD')).toThrow(/invalid BCMath/);
    });
});

describe('moneyAdd', () => {
    it('returns scale-4 string for trivial addition', () => {
        expect(moneyAdd('0.1', '0.2')).toBe('0.3000');
    });

    it('handles large operands exactly (BigInt internally)', () => {
        expect(moneyAdd('1234567890.1234', '9876543210.5678')).toBe('11111111100.6912');
    });

    it('preserves leading zero when sum is below 1', () => {
        expect(moneyAdd('0.0001', '0.0002')).toBe('0.0003');
    });

    it('zero + zero is 0.0000', () => {
        expect(moneyAdd('0', '0')).toBe('0.0000');
    });

    it('respects custom scale', () => {
        expect(moneyAdd('1.5', '2.5', 2)).toBe('4.00');
    });

    it('throws on negative operand', () => {
        expect(() => moneyAdd('-1', '2')).toThrow(/negative/);
        expect(() => moneyAdd('1', '-2')).toThrow(/negative/);
    });

    it('throws on malformed operand', () => {
        expect(() => moneyAdd('abc', '1')).toThrow(/invalid operand/);
    });
});
