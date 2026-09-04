# AGENTS.md

This file provides guidance to coding agents (Codex and others) when working with code in this repository.

## Project Overview

SYNCLOUDPOS is a multi-tenant Point of Sale system for Algerian businesses. Next.js 16 (App Router) + TypeScript + Prisma + PostgreSQL + Redis. Multi-store operations, invoicing, Algerian tax compliance (G50/G12), analytics, subscriptions.

The repo also contains **two Expo / React Native companion apps** that talk to the web app over `/api/mobile/*`:
- `syncloud-gerant/` — manager dashboard (financials, alerts, AI briefs)
- `syncloud-tournee/` — delivery driver app (tours, stops, truck loads, GPS)

`AGENTS.md` at the repo root is a near-verbatim copy of this file for Codex. **When you change CLAUDE.md, mirror the change into AGENTS.md** or the two drift apart.

## Development Commands

### Docker (primary method)
```bash
docker compose up -d              # app + PostgreSQL + Redis
docker compose logs -f app
docker compose up -d --build      # rebuild after code changes
docker compose exec db pg_dump -U syncloud syncloudpos > backup.sql
```

### Local (without Docker)
```bash
npm install
npx prisma generate
npm run dev                       # http://localhost:3000
npm run build
npm run lint                      # eslint . (flat config)
```

**Lint config.** Next 16 removed `next lint`, which used to supply the ESLint config implicitly. The project now has an explicit flat config in `eslint.config.mjs` (`eslint-config-next@16` exports flat-config arrays, so no `FlatCompat` shim) and `npm run lint` runs `eslint .`.

It currently exits clean with **0 errors and ~1120 warnings**. The warnings are deliberate, not neglect:
- `@typescript-eslint/no-explicit-any` is a **warning**, because `tsconfig.json` sets `strict: false` / `noImplicitAny: false` — erroring on `any` would contradict the project's own strictness setting.
- `react/no-unescaped-entities` is **off**: the UI copy is French, so apostrophes in `l'article` are correct content.
- The React Compiler rules from `eslint-plugin-react-hooks@7` (`set-state-in-effect`, `preserve-manual-memoization`, `static-components`, `purity`, `immutability`) are **warnings** — this codebase predates them and each hit needs a considered per-component refactor.
- `require()` is allowed in `scripts/`, `scratch/`, `prisma/`, and root-level `*.js` (ad-hoc Node diagnostics).

Keep it at zero errors; treat the warning count as debt to burn down.

### Tests (Vitest + jsdom)
```bash
npm test                          # vitest run — all tests
npm run test:watch
npx vitest run src/__tests__/treasury.test.ts        # single file
npx vitest run -t "createExpense creates a DEBIT"    # single test by name
npx vitest run --coverage
```
Tests live in `src/__tests__/` (orders, payments, treasury, ledger, plus `serialize`, `rbac-guards` and `rate-limit` which pin down security/serialization invariants). They unit-test **server actions** with a deep-mocked Prisma client (`vitest-mock-extended`), never a real DB. `src/__tests__/setup.ts` globally mocks `next/cache`, `@/auth`, `@/lib/subscription`, and `@/lib/rbac` — so a new test file gets an authenticated `test-tenant-id` session and all permissions granted for free. Mock `@/lib/db` per-file with `mockDeep<PrismaClient>()`, and stub `db.$transaction` to invoke its callback.

### Type checking
`next.config.ts` sets `typescript.ignoreBuildErrors: true` — **`npm run build` will not catch type errors.** Run `npm run typecheck` (`tsc --noEmit`) explicitly.

The root `tsconfig.json` **excludes `syncloud-gerant/` and `syncloud-tournee/`**. They are separate Expo projects with their own `tsconfig.json` and their own dependency trees; when the root config globbed `**/*.ts` it swept them in and reported ~168 phantom `TS2307: Cannot find module 'react-native'` errors, which made the type gate permanently red and therefore ignored. Type-check the mobile apps from inside their own directory (`npm run check`).

### Database
```bash
npx prisma db push                # what deployment actually uses
npx prisma studio
npx prisma validate
npx prisma migrate dev --name x   # rarely used — see note below
```
`prisma/migrations/` exists but holds only a handful of migrations; `docker-entrypoint.sh` runs `npx prisma db push --skip-generate` on container start. **`schema.prisma` is the source of truth, not the migration history.** Don't assume a migration file exists for a given column.

Helper scripts in `scripts/`: `seed-admin.ts`, `promote-superadmin.ts`, `reconcile-stock.ts`, `reconcile-balances.js`, `backup.js`/`restore.js`, `generate-license.js`.

## Architecture

### Multi-tenancy
- Every query MUST filter by `tenantId` from the session. No row-level security — isolation is application-layer only.
- Session fields: `tenantId`, `role`, `defaultStoreId`, `isSuperadmin`, `isBlocked`, `subscriptionEndsAt`.

### Two independent auth systems
1. **Web — NextAuth v5.** Dual config: `src/auth.config.ts` (Edge-safe, no Prisma, used by middleware) + `src/auth.ts` (full server config). Providers: Credentials (email/phone + password) and Google OAuth, which auto-creates tenant → default store → treasury accounts. JWT strategy; custom claims injected via callbacks.
2. **Mobile — bare JWT.** `src/lib/mobile-auth.ts` signs/verifies `Bearer` tokens with `AUTH_SECRET`/`NEXTAUTH_SECRET`. Route handlers call `requireMobileAuth(req)` (throws `UnauthorizedError`) and wrap in `try/catch` with `mobileErrorResponse(error)`. `hasPermission()` does **not** apply here — mobile routes check `user.role` inline. `/api/mobile/*` is in the middleware's public-path list, so each route is responsible for its own authorization.

### `src/middleware.ts` is the gate
Composes NextAuth (Edge) + `next-intl`, and additionally handles: public-path allowlist, in-memory per-IP login rate limiting (10 / 15 min; per-process and resets on restart — middleware runs on Edge so it cannot reach Redis), CORS for `/api/mobile/*` (origins from `MOBILE_ALLOWED_ORIGINS` + `AUTH_URL`), blocked-tenant redirect to `/settings`, superadmin gating of `/superadmin`, and the security headers + CSP. Adding a new public page or API namespace means editing `PUBLIC_PATHS` here.

### Server actions (`src/actions/`, ~70 files)
All `"use server"`, return `{ success, data }` / `{ error }` — never throw to the client. Three permission patterns coexist:
- **Preferred for new code:** `safeAction(schema, "module:action", "AUDIT_ACTION", "ENTITY", handler)` from `src/lib/safe-action.ts` — bundles session check, blocked-tenant check, permission check, Zod validation, deep XSS sanitization of strings, audit logging, and Prisma error → French message mapping (P2002/P2025). It currently has **no call sites**: every existing action uses the inline `hasPermission` pattern below, so migrating them is open work.
- `const { hasPermission } = await import("@/lib/rbac")` then `if (!(await hasPermission("module:action"))) return { error: "Accès refusé" }`
- `requirePermission("module:action")` (throws)

Both RBAC helpers take a permission *string* and resolve the session internally via `auth()`. Prisma is `import { db } from "@/lib/db"`. Call `revalidatePath()` after mutations.

### RBAC (`src/lib/rbac.ts`)

**Every mutating server action must carry a permission guard.** The RBAC matrix is enforced only by these guards — the UI is not a security boundary, and server actions are reachable as POST endpoints by any authenticated user regardless of what the UI renders. Put the guard **first in the function body**, before any database work, so a denied call cannot read or write anything:

```ts
// RBAC Check
const { hasPermission } = await import("@/lib/rbac")
if (!(await hasPermission("purchases:create"))) return { error: "Accès refusé" }
```

Match the failure shape to whatever the function already returns (`{ error }`, `[]`, or `throw`) so the guard does not break the caller's type. `src/__tests__/rbac-guards.test.ts` asserts both that a denied permission refuses and that it refuses *before* touching the database.

Permissions are `"module:action"` with wildcards (`"module:*"`, `"*:*"`). `ADMIN` = `*:*`; superadmin bypasses everything. Roles: ADMIN, MANAGER, CASHIER, VENDEUR, ACCOUNTANT, STOCK_MANAGER. The `Module` and `Action` union types are the authoritative list — extend them when adding a feature area.

### Decimal / Date serialization
Prisma `Decimal` and `Date` do not cross the RSC boundary. Wrap anything returned from a server component or action with `serializeData()` from `src/lib/serialize.ts` (recursive; duck-types Decimal so it survives minification). Several past production bugs were exactly this — check it before returning query results containing money fields.

**`serializeData()` is the only permitted approach — do not use `JSON.parse(JSON.stringify(...))`.** They are not equivalent: `serializeData` calls `Decimal.toNumber()` and yields a **number**, while the JSON round-trip goes through `Decimal.toJSON()` and yields a **string**. The codebase used to do both, so the same money field arrived as a number on some paths and a string on others — which is how `"12.50" + "3.00"` becomes `"12.503.00"`. All 21 round-trip sites were converted; `src/__tests__/serialize.test.ts` pins the behaviour and will fail if the divergence returns.

### Treasury is the financial source of truth
- Every financial flow (sale, purchase, expense, payment) creates a `TreasuryTransaction`. There is **no** Payment model.
- Account types: `CAISSE`, `BANK`. Transaction types: `CREDIT` (in), `DEBIT` (out).
- `source`: `SALE` | `PURCHASE` | `EXPENSE` | `MANUAL_IN` | `MANUAL_OUT`; link via `orderId` / `salesOrderId` / `purchaseOrderId` / `expenseId`.
- Each row stores a balance snapshot for audit. Do balance updates + transaction creation inside `db.$transaction`.

### Redis (`src/lib/redis.ts`)
Singleton with graceful fallback — **the app must work with Redis down**. `withCache(key, fn, ttl)`, `invalidateCache(prefix)`. 5s connect timeout, 3 retries. Used for products, categories, analytics.

`rateLimit(identifier, limit, windowMs)` is the exception to "degrade to pass-through": it falls back to an **in-process limiter** rather than returning success when Redis is unavailable, because failing open on a rate limiter means anyone who can make Redis unreachable gets unlimited login attempts. It sets `degraded: true` when running on the fallback. The real login gate lives in `src/actions/login.ts` (Node runtime, 5 attempts/min per identifier); the middleware limiter is a second, weaker layer.

### i18n (next-intl)
Locales `en` / `fr` (default) / `ar`, prefix `always` (`/fr/dashboard`). Config in `src/i18n/routing.ts`; use `createNavigation()` for locale-aware `Link`, `redirect`, `useRouter`. Message catalogs in `messages/{en,fr,ar}.json` — all three must be updated together. Arabic implies RTL.

### Client state
Zustand only, and effectively only for the POS cart (`src/hooks/use-pos-store.ts`): multiple parallel order sessions, persisted to localStorage, auto-recalculates prices on client-type change. No Redux/Context — everything else is fetched server-side.

Offline POS: `src/lib/offline-queue.ts` queues orders in IndexedDB (`idb-keyval`) with `OFFLINE-####` receipt numbers and syncs on reconnect. Anything touching order creation must keep the offline payload shape in sync.

### Route groups (`src/app/[locale]/`)
`(auth)` login/register · `(dashboard)` the ~60 business modules · `(pos)` POS + customer-facing `display` · `(superadmin)` cross-tenant admin. Non-localized: `src/app/api/`, `src/app/receipt/[id]`, `src/app/activate`.

### Algerian tax compliance
Regimes `G50` (TVA) or `G12` (IFU) per tenant — reports in `src/actions/g50.ts` / `g12.ts`. Supplier withholding (retenue à la source) 0/10/15/24%, computed **at purchase-order creation** and stored in `PurchaseOrder.withholdingAmount`. Stamp tax (`stampTaxEnabled`) and TAP (`tapRate`) are per-tenant settings. TVA rates are per-product.

## Key Domain Models

Three separate order concepts — don't conflate them:
- `Order` — POS / cash register sale
- `SalesOrder` — B2B invoice (Bon de Livraison)
- `PurchaseOrder` — supplier order

All follow PENDING → CONFIRMED → DELIVERED/COMPLETED → CANCELLED, and take their numbers from `SequenceCounter` (per tenant, per document type).

`Product` carries three price tiers — `retailPrice`, `dealerPrice`, `wholesalePrice` — selected by the customer's client type (RETAIL / RESELLER / WHOLESALE); `cost` is separate for margin. **Never write `Product.stock` directly** — go through `StockMovement`.

Everything else (`Tenant`, `Store`, `User`, `Customer`, `Supplier`, `TreasuryAccount`, `Expense`, `DailyClose`, `Promotion`, `RecurringInvoice`, `DeliveryTour`/`TruckLoad`, `AuditLog`, …) is discoverable in `prisma/schema.prisma`.

## Environment Variables

Required: `NEXTAUTH_SECRET`, `DATABASE_URL`.

Optional: `REDIS_URL`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_ID`, `GEMINI_API_KEY`, `SUPERADMIN_WHATSAPP`, `MOBILE_ALLOWED_ORIGINS`, `SENTRY_ORG`/`SENTRY_PROJECT`.

Docker-injected: `NEXTAUTH_URL`, `AUTH_URL`, `AUTH_TRUST_HOST`, `SYNCLOUDPOS_MODE` (`local` | `cloud`), `MACHINE_ID`, `LICENSE_FILE`.

### Licensing (`src/lib/license.ts`)
On-prem installs are gated by an Ed25519-signed `license.key` bound to `MACHINE_ID` (set by `install.bat`/`install.sh`) and mounted into the container. `SYNCLOUDPOS_MODE=cloud` disables all license checks — that's how the hosted VPS runs. Related surfaces: `/api/license/*`, `/activate`, `/superadmin/licenses`.

## Deployment

Production is a VPS at `https://chirpedbeo.online`, deployed by **pushing to a bare git remote**, not through GitHub:

```bash
git push vps master
```

`deploy.bat` wraps this: `git add .` → commit → `npx vitest run` (aborts the deploy on failure) → `git push vps master`. The `deploy_*.py` scripts at the repo root are one-off paramiko/SFTP hotfix scripts that upload individual files to `/var/www/syncloudpos` and rebuild — they are historical artifacts, not a maintained pipeline.

`.github/workflows/main.yml` (lint + build) triggers only on `main`, but the working branch is `master`, **so CI does not currently run on pushes.** Don't rely on it as a gate.

Sentry is wired in via `withSentryConfig` in `next.config.ts` with `tunnelRoute: "/monitoring"`.

Health check: `/api/health`.

### Before committing
1. `npm run typecheck` — **must be zero.** `next.config.ts` sets `ignoreBuildErrors: true`, so `npm run build` will happily ship type errors; tsc is the only gate. The tree is at 0, so any error you see is one you introduced.
2. `npm test`
3. `npm run lint` — must be zero *errors* (warnings are expected; see above)
3b. `npm run check:secrets` — scans staged changes for plaintext credentials. Enable it as a hook once per clone with `git config core.hooksPath .githooks`.
4. `npx prisma validate` if the schema changed

## Common Gotchas

1. **Always filter by `tenantId`** — omitting it leaks data across tenants.
2. **No Payment model** — payments are `TreasuryTransaction` rows.
3. **Redis is optional** — code must degrade gracefully without it.
4. `auth.config.ts` is Edge — it **cannot** import Prisma or anything Node-only.
5. **`serializeData()` Decimals/Dates** before returning them across the RSC boundary — never `JSON.parse(JSON.stringify(...))`, which yields strings instead of numbers for money.
6. **Never touch `Product.stock` directly** — use `StockMovement`.
7. Invoice numbers come from `SequenceCounter`, never from a count.
8. Withholding tax is computed at PO creation, not at payment.
9. `/api/mobile/*` bypasses the middleware's auth check — each handler must call `requireMobileAuth` itself.
10. Locale prefix is mandatory; there is no automatic locale detection.
11. `npm run build` succeeds despite type errors.
12. New i18n strings need entries in all three of `messages/en.json`, `fr.json`, `ar.json`.
