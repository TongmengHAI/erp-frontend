// ─────────────────────────────────────────────────────────────────────────────
// Vitest setup — jsdom polyfills + globals.
//
// jsdom doesn't ship ResizeObserver or IntersectionObserver. PrimeVue's
// TabList uses ResizeObserver for ink-bar tracking; without a polyfill,
// mounting a TabGroup blows up. The no-op shim is sufficient for unit tests
// — we're not asserting on resize behavior.
// ─────────────────────────────────────────────────────────────────────────────

class ResizeObserverShim {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

class IntersectionObserverShim {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
        return [];
    }
    root = null;
    rootMargin = '';
    thresholds = [];
}

if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = ResizeObserverShim as unknown as typeof ResizeObserver;
}

if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver =
        IntersectionObserverShim as unknown as typeof IntersectionObserver;
}
