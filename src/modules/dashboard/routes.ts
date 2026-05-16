// ─────────────────────────────────────────────────────────────────────────────
// Dashboard module routes.
//
// The actual RouteRecordRaw lives in router/index.ts as a child of the
// AppShellLayout parent route — declaring nested fragments here would
// fragment the shell tree across files. This file exports the named-route
// constant so consumers reference it without magic strings.
// ─────────────────────────────────────────────────────────────────────────────

export const DASHBOARD_ROUTES = {
    DASHBOARD: 'dashboard',
} as const;
