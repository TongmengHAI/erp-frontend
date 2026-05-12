# Frontend — Vue 3 SPA

This directory is the **frontend service** of the ERP. The canonical project context lives at [`../CLAUDE.md`](../CLAUDE.md) — read it in full before responding to any request here. It captures the locked tech stack, architectural rules, agent rules, and build order for the whole ERP.

This file is just a breadcrumb.

## Quick refs

- **Stack:** Vue 3 (`<script setup>`, Composition API), TypeScript (non-negotiable), Vite 6
- **State:** Pinia (one store per domain) + TanStack Query (server cache)
- **UI:** PrimeVue 4 (Aura theme) + Tailwind CSS 4
- **Forms:** VeeValidate + Zod
- **Tests:** Vitest unit, Playwright E2E
- **Auth:** Talks to the Laravel API via Sanctum SPA cookies. Dev server proxies `/api`, `/sanctum`, `/up` to `http://127.0.0.1:8000`.
- **Layout:**
  - `src/modules/<domain>/` — mirrors backend domains (accounting, hrm, inventory, …)
  - `src/shared/` — cross-domain primitives (api clients, composables, components, types)
- **Routing:** route-level code splitting per module — each `modules/<X>/routes.ts` registers in `src/router/index.ts`.
