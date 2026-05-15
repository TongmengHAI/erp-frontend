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

// Node 25+ ships an experimental native `localStorage` global that requires
// the --localstorage-file CLI flag to be backed by a real store. Without it,
// the global is present but its methods are undefined, and Node's global
// shadows the jsdom-provided one. Replace both web Storage globals with a
// simple in-memory Storage-shaped object so tests can read/write/remove keys.
class MemoryStorage {
    private store = new Map<string, string>();
    get length(): number {
        return this.store.size;
    }
    clear(): void {
        this.store.clear();
    }
    getItem(key: string): string | null {
        return this.store.has(key) ? (this.store.get(key) as string) : null;
    }
    key(index: number): string | null {
        return Array.from(this.store.keys())[index] ?? null;
    }
    removeItem(key: string): void {
        this.store.delete(key);
    }
    setItem(key: string, value: string): void {
        this.store.set(key, String(value));
    }
}
Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: new MemoryStorage(),
});
Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: new MemoryStorage(),
});

// jsdom does not implement window.matchMedia. PrimeVue's Select (used inside
// DataTable's rows-per-page dropdown) calls it during onMounted to bind an
// orientation listener. The shim returns an inert MediaQueryList shape so
// callers can register listeners without errors firing in jsdom.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: (query: string): MediaQueryList =>
            ({
                matches: false,
                media: query,
                onchange: null,
                addListener: () => {},
                removeListener: () => {},
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => false,
            }) as unknown as MediaQueryList,
    });
}
