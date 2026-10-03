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
Puppy-first, free-first pet information site with an optional AI subscription. The content is not veterinary advice and is not veterinarian-reviewed.
- **Public routes**: `/`, `/guides`, `/guides/new-puppy-checklist`, `/guides/puppy-first-30-days`, `/guides/toxic-foods-for-puppies`, `/pricing`, `/puppy-kit/`, `/privacy`, `/terms`, `/refund`, `/medical-disclaimer`.
- **Private/noindex routes**: `/success` (post-payment), `/chat` (AI chatbot), `/admin/analytics` (internal nudge-conversion dashboard). Noindex is not an access-control mechanism.
- **Stripe**: subscription payment link is `STRIPE_PAYMENT_LINK` in `src/content/site.ts`, imported by landing, chat, and pricing. Advertised subscription remains $4.99/month. Puppy Kit has a separate $12 one-time checkout recovered from the live site.
- **SEO/content**: metadata and route definitions live in `src/content/site.ts`; recovered guide copy in `src/content/recovered-guides.json`. Build generates route-specific metadata, full guide/legal/pricing HTML, robots.txt and sitemap.xml. Old guide `.html` URLs redirect with 301.
- **Production server**: `server.mjs` serves built documents and returns a friendly actual 404 for unknown URLs. Do not restore a wildcard rewrite to index.html. Run `pnpm --filter @workspace/paw-and-whisker run test:site` after a frontend build to check HTTP/SEO/content behavior.
- **Legal pages**: plain-English drafts, requiring review of legal, security and retention commitments before launch. Export/deletion requests are contact-based, not automated.
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
