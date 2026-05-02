# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2 for chat)

## Applications

### Paw and Whisker AI (`artifacts/paw-and-whisker`)
Landing page + chatbot for a pet health and behavior AI subscription service.
- **Routes**: `/` (landing), `/success` (post-payment), `/chat` (AI chatbot), `/admin/analytics` (internal nudge-conversion dashboard)
- **Stripe**: "Start for $4.99/month" button — replace `STRIPE_PAYMENT_LINK` in `Landing.tsx`
- **After payment**: Stripe redirects to `/success`, which links to `/chat`
- **Admin analytics**: `/admin/analytics` reads `GET /api/analytics/summary`. Both are gated by the `ANALYTICS_ADMIN_TOKEN` env var (sent as the `x-admin-token` request header — header only, no query-string fallback). The dashboard remembers the token in `localStorage` and supports `since`/`until` date filters.
  - **Setting / rotating the token**: store `ANALYTICS_ADMIN_TOKEN` as a Replit Secret (Secrets tab) — *not* as a versioned env var — in every environment that should expose the dashboard (development and production). To rotate, generate a fresh long random string, update the secret, restart the API server workflow, and re-share the new value with whoever needs dashboard access (their browser will prompt for it again on next load). If the secret is unset, the endpoint returns `503` and the dashboard shows a configuration error instead of any data.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
