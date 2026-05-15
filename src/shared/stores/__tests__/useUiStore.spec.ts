import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useUiStore } from '@/shared/stores/useUiStore';

const STORAGE_KEY = 'ui.sidebarCollapsed';

describe('useUiStore', () => {
    beforeEach(() => {
        // Remove our specific key so each test starts from a known empty
        // slate. (Some jsdom builds proxy localStorage in a way that omits
        // .clear(); removeItem on the one key we use is sufficient.)
        localStorage.removeItem(STORAGE_KEY);
        // jsdom default innerWidth is 1024; collapsed default fires for <1024.
        // Force a desktop width so the bare default is `false`.
        Object.defineProperty(window, 'innerWidth', {
            configurable: true,
            value: 1280,
        });
        setActivePinia(createPinia());
    });

    it('initial state is sidebarCollapsed=false on desktop with no localStorage', () => {
        const ui = useUiStore();
        expect(ui.sidebarCollapsed).toBe(false);
    });

    it('reads sidebarCollapsed=true from localStorage on init', () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        const ui = useUiStore();
        expect(ui.sidebarCollapsed).toBe(true);
    });

    it('toggleSidebar() flips the value and persists to localStorage', () => {
        const ui = useUiStore();
        expect(ui.sidebarCollapsed).toBe(false);

        ui.toggleSidebar();
        expect(ui.sidebarCollapsed).toBe(true);
        expect(localStorage.getItem(STORAGE_KEY)).toBe('true');

        ui.toggleSidebar();
        expect(ui.sidebarCollapsed).toBe(false);
        expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });

    it('setSidebarCollapsed(value) writes the explicit value and persists', () => {
        const ui = useUiStore();
        ui.setSidebarCollapsed(true);
        expect(ui.sidebarCollapsed).toBe(true);
        expect(localStorage.getItem(STORAGE_KEY)).toBe('true');

        ui.setSidebarCollapsed(false);
        expect(ui.sidebarCollapsed).toBe(false);
        expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });

    it('defaults sidebarCollapsed=true at tablet widths (<1024px) when no localStorage exists', () => {
        Object.defineProperty(window, 'innerWidth', {
            configurable: true,
            value: 800,
        });
        const ui = useUiStore();
        expect(ui.sidebarCollapsed).toBe(true);
    });
});
