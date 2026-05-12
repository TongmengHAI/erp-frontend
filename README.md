# ERP Frontend

Vue 3 + TypeScript + Vite SPA. Talks to the Laravel API via `/api/v1/*` (proxied during dev).

## Setup

```sh
npm install
npm run dev          # http://localhost:5173 — proxies /api → http://127.0.0.1:8000
```

## Stack

| Concern | Library |
|---|---|
| Framework | Vue 3 (`<script setup>`, Composition API) |
| Router | vue-router |
| Client state | Pinia (one store per domain) |
| Server state | TanStack Query (Vue Query) |
| UI base | PrimeVue 4 (Aura theme) |
| Styling | Tailwind CSS 4 (via `@tailwindcss/vite`) |
| Forms | VeeValidate + Zod |
| HTTP | axios (with Sanctum credentials) |
| Type-check | vue-tsc |
| Unit tests | Vitest + @vue/test-utils + jsdom |
| E2E | Playwright |

## Layout

```
src/
├── modules/        # mirrors backend domains (accounting, hrm, inventory, ...)
│   └── <domain>/{pages,components,composables,api,types,stores,routes.ts}
└── shared/         # cross-domain primitives
    ├── api/        # typed clients (axios + Sanctum)
    ├── components/
    ├── composables/
    ├── stores/
    ├── utils/
    ├── types/
    └── views/      # framework-level screens (Home, NotFound, etc.)
```

Route-level code splitting per module. New modules add their own `routes.ts` and register in `src/router/index.ts`.
