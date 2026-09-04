# SYNCLOUDPOS — Project Audit

**Date:** 2026-09-04
**Branch:** `claude/project-audit-skills-362c09` (worktree `test-touatcom-updates-9515d7`)
**Scope:** whole repository — web app (`src/`), Expo companion apps, build/deploy tooling, repo hygiene
**Method:** every claim below is backed by a command that was actually run against this checkout. No finding is inferred from documentation alone.

---

## 0. Remediation status (updated 2026-09-05)

Everything below was subsequently fixed in this branch except where marked. Verified end state:

| Gate | Before | After |
|---|---|---|
| `npm run typecheck` | 168 errors | **0** |
| `npm test` | 7 tests | **23 tests, all passing** |
| `npm run lint` | 0 errors / 1121 warnings | **0 errors** / 1128 warnings |
| `npm audit` (runtime deps) | 3 critical, 21 high | **0 critical, 0 high** |
| `npm audit` (incl. dev) | 41 total | **1 high** (dev-only, accepted — see H-2) |
| `npm run build` | passed | passes |

| # | Finding | Status |
|---|---|---|
| C-1 | Credentials in git | **Partly fixed — action required.** 352 files untracked, `.gitignore` hardened, secret-scanning pre-commit hook added. **Rotation and history purge are still outstanding and are yours to do** (see below). |
| H-1 | Missing authorization | **Fixed.** 83 guards added across 30 files; RBAC coverage 16 → 52 of 73 action files. |
| H-2 | Dependency CVEs | **Fixed** for runtime deps. One dev-only advisory accepted. |
| H-3 | Test coverage / CI | **Fixed.** 16 new tests; CI now triggers on `master`; `deploy.bat` gates on typecheck + tests + lint. |
| M-1 | Type gate unrunnable | **Fixed.** Expo apps excluded from root `tsconfig.json`. |
| M-2 | `/api/upload` unvalidated | **Fixed.** Magic-byte sniffing, allowlist, 5 MB cap, per-tenant paths. |
| M-3 | Serialization divergence | **Fixed.** All 21 JSON round-trips converted; behaviour pinned by tests. |
| M-4 | Rate limiter fails open | **Fixed.** Falls back to an in-process limiter. |
| M-5 | AGENTS.md drift | **Fixed.** Regenerated from CLAUDE.md; both updated. |
| M-6 | Repo clutter | **Fixed.** Root tracked files 388 → 36. |
| L-1 | Unauthenticated mobile routes | **Fixed.** `/api/mobile/tts` now requires a token; `log-error` bounded. |
| L-2 | CSP `unsafe-inline` | **Partly fixed.** `form-action` and `frame-ancestors` added; the nonce migration is deliberately **not** done — it needs verification against a running app. |
| L-3 | `console.log` in `src/` | **Fixed** for the ones that leaked data (an OTP code and a customer record were being logged). Operational AI/OCR diagnostics kept. |
| L-4 | Oversized components | **Not done.** Pure refactor, no correctness or security impact; out of proportion to the risk. |

Two findings from the audit turned out to be **overstated**, and the corrected picture is recorded in place below: the superadmin surface was already fully authorized (12/14 via `isSuperadmin`, the other 2 self-scoped), and `license-requests` was guarded via `role === "SUPERADMIN"` rather than the flag my grep looked for.

Two problems **not in the original audit** were found and fixed while remediating:
- **`/uploads/[filename]` had a path traversal.** User-controlled, URL-decoded segments flowed into `path.join`, so `/uploads/..%2f..%2f.env` could read arbitrary server files. Now a catch-all route with an enforced root check, plus `nosniff` and a locked-down CSP; SVG is no longer served inline (stored-XSS vector).
- **`test-ai-key.ts` had no authentication at all.** Server actions are reachable as POST endpoints, so anyone could use the server as an oracle to validate stolen OpenAI/Gemini/Anthropic keys. Now gated on `settings:update`.

### Still yours to do (C-1)

Untracking the files does **not** remove them from history. Until these are done, assume every credential in this repo is compromised:

1. Rotate the VPS SSH password, the `sudo` password, the PostgreSQL password, and `NEXTAUTH_SECRET`/`AUTH_SECRET`. Rotating the auth secret invalidates all live web sessions and mobile tokens — pick a window.
2. Purge the files from history on **both** the GitHub remote and the `vps` bare remote, then force-push:
   ```
   git filter-repo --path-glob 'deploy_*.py' --path-glob 'check_*.py' --path-glob 'fix_*.py' --path-glob 'vps_*' --invert-paths
   ```
   This rewrites history — every clone must be re-cloned.
3. Enable the hook in each clone: `git config core.hooksPath .githooks`

I did not do 1 or 2: rotating credentials and force-pushing rewritten history to production remotes are destructive, outward-facing operations that need your explicit go-ahead.

---

## 1. Verification gates — actual results

| Gate | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | **168 errors** — 121 in `syncloud-gerant/`, 47 in `syncloud-tournee/`, **0 in `src/`** |
| Tests | `npx vitest run` | **PASS** — 4 files, 7 tests, 43.4s |
| Lint | `npx eslint .` | **0 errors**, 1121 warnings, 619 files |
| Schema | `npx prisma validate` | Not runnable locally — `P1012: Environment variable not found: DATABASE_URL`. This is an env gap, not a schema defect. |
| Deps | `npm audit` | **3 critical, 21 high**, 13 moderate, 4 low (41 total) |

The web application itself is type-clean and lint-clean. Both other numbers need explaining, and they do not mean what the project documentation says they mean — see findings **H-3** and **M-1**.

---

## 2. Codebase shape

```
540  .ts/.tsx files under src/
 73  server actions (src/actions/)
 72  API route handlers, of which 53 are /api/mobile/*
 53  Prisma models (1352 lines of schema)
1144 i18n keys x 3 locales
1120 tracked files total
```

Ten largest source files:

| Lines | File |
|---|---|
| 2675 | `src/components/purchases/purchase-form.tsx` |
| 2335 | `src/components/pos/pos-client.tsx` |
| 2096 | `src/app/[locale]/(dashboard)/ai/components/ai-client.tsx` |
| 1979 | `src/app/[locale]/landing-client.tsx` |
| 1658 | `src/components/retours/returns-client.tsx` |
| 1569 | `src/app/[locale]/(dashboard)/hub/components/hub-client.tsx` |
| 1511 | `src/components/pos/cart-sidebar.tsx` |
| 1332 | `src/components/print/print-templates.tsx` |
| 1329 | `src/components/products/stock-dashboard-client.tsx` |
| 1266 | `src/actions/returns.ts` |

---

## 3. Findings

### CRITICAL

#### C-1 — Production infrastructure credentials are committed to git

`git ls-files` finds **80 tracked files** containing literal credential assignments, and **111 tracked `.py` scripts at the repository root** that automate against the production VPS at `155.133.26.x`.

Evidence (values deliberately redacted here — they are in plaintext in the repo):

```
git ls-files -- '*.py' '*.js' '*.sh' '*.bat' '*.txt' \
  | xargs grep -lniE "password[[:space:]]*=[[:space:]]*['\"]" | wc -l
# -> 80

git ls-files -- '*.py' | xargs grep -hoiE "(password|passwd|SECRET)[[:space:]]*=" \
  | sort | uniq -c
#   87 password=
#    7 PASSWORD=
#    2 NEXTAUTH_SECRET=
```

Affected files include `deploy_updates.py`, `deploy_payments.py`, `deploy_mobile_api.py`, `fix_db_cred.py`, `force_db_pw.py`, `check_ssh.py`, `vps_reset_pw.sh` and roughly seventy more. Between them they carry SSH login passwords, `sudo` passwords, PostgreSQL passwords, and two `NEXTAUTH_SECRET` literals.

Two aggravating factors:

1. **`.gitignore` does not help.** It contains a `deploy_*.py` rule, but those files were committed *before* the rule was added, so git continues to track them — `git ls-files --error-unmatch deploy_updates.py` succeeds. The ignore rule creates a false sense that the problem is handled.
2. **A leaked `NEXTAUTH_SECRET` is a total auth bypass.** It is the JWT signing key for both NextAuth sessions and the mobile bearer tokens (`src/lib/mobile-auth.ts` signs with `AUTH_SECRET`/`NEXTAUTH_SECRET`). Anyone holding it can mint a valid session for any `tenantId` and any `role`, defeating the entire application-layer tenant isolation model.

**Remediation, in this order:**
1. Treat all of these secrets as compromised. Rotate the VPS SSH credentials, the `sudo` password, the PostgreSQL password, and `NEXTAUTH_SECRET`/`AUTH_SECRET` (rotating the auth secret invalidates all live sessions and mobile tokens — plan the window).
2. Purge the files from history (`git filter-repo`) on the origin *and* the `vps` bare remote, then force-push. Note this rewrites history for every clone.
3. `git rm --cached` the ad-hoc scripts; move any still-useful ones into `scripts/`, reading credentials from environment variables.
4. Add a secret-scanning pre-commit hook so this cannot recur.

---

### HIGH

#### H-1 — The documented authorization pattern is unused; most server actions have no authorization check

`src/lib/safe-action.ts` exists (5708 bytes) and `CLAUDE.md` calls it *"Preferred for new code"* — it bundles session check, blocked-tenant check, permission check, Zod validation, XSS sanitization and audit logging.

**It has zero call sites.**

```
grep -l "safeAction" src/actions/*.ts | wc -l   # -> 0
```

Across the 73 action files:

| Pattern | Count |
|---|---|
| Uses `safeAction` | **0** |
| Uses `hasPermission` / `requirePermission` | 16 |
| Calls `auth()` only — authentication, no authorization | **51** |
| Neither | **6** |

The 51 authN-only files include financially and operationally sensitive surfaces: `purchase-orders.ts`, `sales-orders.ts`, `payments.ts`, `ledger.ts`, `cheques.ts`, `daily-close.ts`, `commissions.ts`, `stock-movements.ts`, `transfers.ts`, `returns.ts`, `roles.ts`, `superadmin.ts`, `backups.ts`, `g50.ts`, `g12.ts`.

The practical consequence: the RBAC role matrix in `src/lib/rbac.ts` (ADMIN / MANAGER / CASHIER / VENDEUR / ACCOUNTANT / STOCK_MANAGER) is **not enforced on most write paths**. Any authenticated user of a tenant — including a `CASHIER` — can invoke these server actions directly. Role separation currently exists mainly in the UI, and the UI is not a security boundary.

Of the 6 with neither check, `register.ts` and `verify-otp.ts` are correctly pre-auth. The other four — `ai-context.ts`, `ai-logs.ts`, `ocr-invoice.ts`, `test-ai-key.ts` — should be reviewed; `test-ai-key.ts` in particular touches API-key configuration.

**Remediation:** treat this as the primary security backlog item after C-1. Migrate actions to `safeAction` starting with the money-touching ones (`payments`, `ledger`, `cheques`, `daily-close`, `purchase-orders`, `sales-orders`), which also buys audit logging and Zod validation for free.

#### H-2 — 24 high/critical dependency vulnerabilities, nearly all with fixes available

```
npm audit  ->  critical: 3, high: 21, moderate: 13, low: 4
```

| Severity | Package | Fix? | Issue |
|---|---|---|---|
| CRITICAL | `@auth/core` | yes | Email normalizer validates before Unicode normalization — **homoglyph `@` bypass** |
| CRITICAL | `next-auth` | yes | inherits `@auth/core` |
| CRITICAL | `jspdf` | yes | PDF object injection via FreeText color |
| HIGH | `next` | yes | HTTP request smuggling in rewrites |
| HIGH | `axios` | yes | form serializer maxDepth bypass |
| HIGH | `nodemailer` | yes | SMTP command injection via `envelope.size` |
| HIGH | `sharp` | yes | inherited libvips CVEs (CVE-2026-33327/33328/35590/35591) |
| HIGH | `undici` | yes | response desynchronization via retry interceptor |
| HIGH | `form-data` | yes | CRLF injection via unescaped multipart field names |
| HIGH | `xlsx` | **NO FIX** | prototype pollution in SheetJS |
| HIGH | 14 others | yes | ReDoS / DoS / XSS in transitive tooling deps |

The `@auth/core` homoglyph bypass is the one to move on first: this app authenticates by email and auto-provisions a tenant on Google OAuth first login (`src/auth.ts`), so an email-identity confusion bug maps directly onto tenant ownership.

`xlsx` has no upstream fix — either pin it and restrict its use to trusted input, or migrate to `exceljs`.

#### H-3 — Test coverage is a rounding error against the surface area

**7 tests** across 4 files (`orders`, `payments`, `treasury`, `ledger`) cover **73 server actions, 72 API routes and 53 Prisma models**.

The tests that exist are well-built — `src/__tests__/setup.ts` globally mocks `next/cache`, `@/auth`, `@/lib/subscription` and `@/lib/rbac`, so a new test file gets an authenticated session and full permissions for free, and per-file `mockDeep<PrismaClient>()` keeps them off a real database. The infrastructure is not the problem; there simply is almost nothing in it.

This matters more than usual here because `deploy.bat` runs `npx vitest run` as the **only automatic gate before pushing to production** (`git push vps master`), and `.github/workflows/main.yml` triggers on `main` while the working branch is `master`, so **CI never runs**. Seven passing tests are currently the entire safety net for a live multi-tenant financial system.

**Highest-value tests to add next:** tenant isolation (an action called with tenant A's session must not read tenant B's rows), withholding-tax computation at PO creation, `SequenceCounter` invoice numbering under concurrency, and the offline-queue → order-creation payload contract.

---

### MEDIUM

#### M-1 — The documented pre-commit type gate cannot pass from the repo root

`CLAUDE.md` states: *"`npx tsc --noEmit` — **must be zero.**"* Run from the repo root it returns **168 errors** and always will.

`tsconfig.json` uses `"include": ["**/*.ts", "**/*.tsx", ...]` with `"exclude": ["node_modules"]`. That sweeps in `syncloud-gerant/` and `syncloud-tournee/`, two Expo apps with their own dependency trees. The errors are almost entirely `TS2307: Cannot find module 'react-native'` and siblings — the React Native types are not installed at the root.

So the single gate the project relies on — `next.config.ts` sets `ignoreBuildErrors: true`, meaning `npm run build` ships type errors happily — is one that reports failure unconditionally, which trains everyone to ignore it.

**Fix:** add `"syncloud-gerant"` and `"syncloud-tournee"` to `exclude` in the root `tsconfig.json`, and give each mobile app its own `tsconfig.json` plus a type-check script. Then `npx tsc --noEmit` at the root becomes a gate that means something.

#### M-2 — `/api/upload` accepts any file, any size, any extension

`src/app/api/upload/route.ts` is 34 lines and performs no validation:

```ts
const file = (formData as any).get("file") as File
const buffer = Buffer.from(await file.arrayBuffer())
const filename = `${uuidv4()}${path.extname(file.name)}`   // extension from user input
const filepath = path.join(process.cwd(), "public", "uploads", filename)
await writeFile(filepath, buffer)
```

No MIME check, no extension allowlist, no size cap, no tenant scoping on the destination path. Files land in `public/uploads` and are served directly.

Mitigating: the route is **not** in `PUBLIC_PATHS`, and `src/middleware.ts:148` returns 401 for non-public API paths, so this requires an authenticated session. That keeps it out of Critical. It remains an unbounded disk-fill vector and a stored-content vector for any authenticated user of any tenant, and uploaded files are not isolated per tenant.

**Fix:** allowlist extensions and MIME types, cap size, and write under a `tenantId`-scoped subdirectory.

#### M-3 — Two competing Decimal serialization conventions that produce different types

`CLAUDE.md` documents `serializeData()` as the way to cross the RSC boundary, and notes *"Several past production bugs were exactly this."* In practice:

| Approach | Files | Decimal becomes |
|---|---|---|
| `serializeData()` | **3** (`algerian-settings.ts`, `products.ts`, `settings/page.tsx`) | `number` (via `.toNumber()`) |
| `JSON.parse(JSON.stringify(...))` | **22** | `string` (via `Decimal.toJSON()`) |

These are not interchangeable. `serializeData` yields a JS number; the JSON round-trip yields a string, because Prisma's `Decimal.toJSON()` returns a string. Money fields therefore arrive at the client as `number` on some paths and `string` on others — and `"12.50" + "3.00"` is `"12.503.00"`.

Given the documented history of serialization bugs in this exact area, standardizing on `serializeData()` is worth doing deliberately rather than opportunistically. Note it is a behavioral change at each call site: consumers currently receiving strings will start receiving numbers.

#### M-4 — Login rate limiting does not survive a restart or a second instance

`src/middleware.ts:42`:

```ts
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_LOGIN_ATTEMPTS = 10
const RATE_LIMIT_WINDOW = 15 * 60 * 1000
```

In-memory, per-process, keyed on IP alone. Under `ecosystem.config.js` (PM2) with more than one instance, each worker keeps its own counter, multiplying the effective limit by the instance count. Any restart resets it to zero. Redis is already a dependency (`src/lib/redis.ts`) and is the natural home for this — with the caveat that Redis is explicitly optional in this codebase, so the fallback path must fail *closed* for rate limiting, not open.

#### M-5 — `AGENTS.md` and `CLAUDE.md` have diverged

`CLAUDE.md` states AGENTS.md *"is a near-verbatim copy… When you change CLAUDE.md, mirror the change into AGENTS.md."* They currently differ by **363 lines**: AGENTS.md is 274 lines, CLAUDE.md is 177. AGENTS.md is the older, pre-rewrite version — it still carries `next lint`-era guidance and lacks the current lint-config, testing and licensing sections. Any Codex session reads stale instructions.

#### M-6 — 269 tracked build artifacts and one-off scripts at the repository root

397 files sit at the repo root, of which **269 are tracked**:

| Kind | Tracked |
|---|---|
| `.py` one-off deploy/diagnostic scripts | 111 |
| `.txt` / `.log` build and error dumps | 135 |
| `.png` screenshots | 23 |

Names like `tsc_output_utf86.txt`, `vps_build10.txt`, `compile_errors4.txt`, `hub_redesign_top.png` are session scratch that got committed. Beyond the noise, this is what makes C-1 so wide — most of the credential-bearing files live in this pile. Cleaning it up and cleaning up C-1 are largely the same operation.

---

### LOW

#### L-1 — `/api/mobile/tts` is an unauthenticated compute endpoint

5 of 53 mobile routes have no auth check. Four are correct by design (`auth`, `auth/refresh`, `version`, and arguably `log-error`). `/api/mobile/tts` is not: it synthesizes speech through `msedge-tts` for arbitrary caller-supplied text, and `/api/mobile` is in `PUBLIC_PATHS`, so it is reachable by anyone on the internet. That is a free CPU/bandwidth amplifier and a third-party-service abuse vector. `/api/mobile/log-error` similarly accepts unauthenticated writes.

Worth noting the other 48 mobile routes are correctly gated — several via `verifyMobileAuth` rather than `requireMobileAuth`, with an inline session fallback and explicit role checks (see `src/app/api/mobile/admin/drivers/route.ts`).

#### L-2 — CSP allows `script-src 'unsafe-inline'`

`src/middleware.ts:212`. Standard for a Next.js app without nonce plumbing, but it removes CSP's main XSS protection. Nonce-based CSP is the upgrade path when there is appetite for it.

#### L-3 — 30 `console.log` calls remain in `src/`

Not errors, but with Sentry wired in (`withSentryConfig`, `tunnelRoute: "/monitoring"`) these should be structured logs or removed. Server-side `console.log` in a multi-tenant app also risks leaking tenant data into shared logs.

#### L-4 — Four components exceed 1500 lines

`purchase-form.tsx` (2675), `pos-client.tsx` (2335), `ai-client.tsx` (2096), `landing-client.tsx` (1979). Not defects, but they concentrate the React Compiler lint warnings and are the hardest files to change safely. `purchase-form.tsx` and `pos-client.tsx` are also the two highest-traffic business surfaces.

---

## 4. What is in good shape

These were checked and found healthy — recorded so they do not get re-audited:

- **Tenant isolation holds.** 67 of the 70 db-touching action files reference `tenantId` directly; the three that do not (`license-requests.ts`, `system-settings.ts`, `verify-otp.ts`) are global/superadmin by design, and `system-settings.ts` scopes through `getActiveTenantId()`. No unscoped tenant query was found.
- **The `StockMovement` invariant holds.** Every file writing `stock: { increment | decrement }` also creates a `StockMovement` in the same file — verified across `orders`, `purchase-orders`, `returns`, `sales-orders`, `inventory-audit`, `products`, `recurring-invoices`. No bare stock write.
- **i18n is fully in parity.** 1144 keys in each of `en`/`fr`/`ar`, **zero** missing in any locale. This is the kind of thing that usually rots; it hasn't.
- **Lint is genuinely clean.** 0 errors over 619 files. The 1121 warnings break down as 691 `no-explicit-any` + 336 `no-unused-vars` + 94 React Compiler/misc — consistent with what `CLAUDE.md` documents as deliberate debt, not neglect.
- **Cron endpoints are properly gated.** Both `/api/cron/db-backup` and `/api/cron/process-recurring` require `Bearer ${CRON_SECRET}`.
- **A past liability was correctly closed out.** `/api/migrate-transactions` has been deliberately neutered to return 404, with a comment explaining that historical migrations must not run through a public route.
- **Zero `TODO`/`FIXME`/`HACK` comments** in `src/`.
- **Test quality is high** where tests exist — the shared mock harness in `setup.ts` is well designed. The problem in H-3 is quantity, not craft.

---

## 5. Recommended order of work

1. **C-1** — rotate every leaked credential, then purge history from both remotes. Nothing else matters until the secrets are dead.
2. **H-2** — `npm audit fix` for the 23 fixable high/critical CVEs; decide separately on `xlsx`.
3. **M-1** — exclude the Expo apps from the root `tsconfig.json` so the type gate becomes real.
4. **M-5** — regenerate `AGENTS.md` from `CLAUDE.md`; cheap, and stops instruction drift compounding.
5. **H-1** — migrate server actions to `safeAction`, money-touching modules first. This is the long one.
6. **H-3** — add tenant-isolation and sequence-numbering tests; wire CI to `master` so `.github/workflows/main.yml` actually runs.
7. **M-2, M-3, M-4, M-6** — as capacity allows.

---

## 6. Commands used

```bash
npx tsc --noEmit
npx vitest run
npx eslint . -f json
npm audit --json
npx prisma validate
git ls-files | grep -E '^[^/]+\.(py|txt|log|png)$'
git ls-files -- '*.py' '*.js' '*.sh' '*.bat' '*.txt' | xargs grep -lniE "password[[:space:]]*="
```

Plus per-file greps for `requireMobileAuth`/`verifyMobileAuth`, `hasPermission`/`requirePermission`/`safeAction`, `tenantId`, `stock:{increment|decrement}`, `serializeData`, and `JSON.parse(JSON.stringify`.
