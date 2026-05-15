import { defineStore } from 'pinia';

// ─────────────────────────────────────────────────────────────────────────────
// useUiStore — app-wide UI state. Currently only the sidebar collapsed state.
//
// Persistence is a hand-rolled localStorage subscription (not a plugin) — see
// `subscribeToPersistence()` below. The store form is "options" rather than
// "setup" so `$reset()` works natively for the playground (master decision 17).
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ui.sidebarCollapsed';
const TABLET_BREAKPOINT_PX = 1024;

function readInitialCollapsed(): boolean {
    // SSR / non-browser safety. Vitest's jsdom env has window/localStorage,
    // but a fall-through default is cheap insurance.
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return false;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
        try {
            return JSON.parse(raw) === true;
        } catch {
            return false;
        }
    }
    // No saved preference yet — default to collapsed at tablet widths so users
    // landing on a smaller viewport get a usable layout. User toggles persist
    // and override this on subsequent loads.
    return window.innerWidth < TABLET_BREAKPOINT_PX;
}

export const useUiStore = defineStore('ui', {
    state: () => ({
        sidebarCollapsed: readInitialCollapsed(),
    }),
    actions: {
        toggleSidebar(): void {
            this.sidebarCollapsed = !this.sidebarCollapsed;
            this.persist();
        },
        setSidebarCollapsed(value: boolean): void {
            this.sidebarCollapsed = value;
            this.persist();
        },
        persist(): void {
            if (typeof localStorage === 'undefined') return;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sidebarCollapsed));
        },
    },
});
