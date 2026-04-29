# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SYNCLOUDPOS is a multi-tenant Point of Sale system for Algerian businesses. Built with Next.js 16, TypeScript, Prisma, PostgreSQL, and Redis. Supports multi-store operations, invoicing, tax compliance (G50/G12), analytics, and subscriptions.

## Development Commands

### Docker (Primary Development Method)
```bash
# Start all services (app, PostgreSQL, Redis)
docker compose up -d

# Stop services
docker compose down

# View app logs
docker compose logs -f app

# Rebuild after code changes
docker compose up -d --build

# Database backup
docker compose exec db pg_dump -U syncloud syncloudpos > backup.sql
```

### Local Development (Without Docker)
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Database Operations
```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio

# Push schema changes without migration (dev only)
npx prisma db push
```

## Architecture Overview

### Multi-Tenancy Model
- Every database query MUST filter by `tenantId` from session JWT
- No row-level security in database - tenant isolation enforced in application layer
- Session contains: `tenantId`, `role`, `defaultStoreId`, `subscriptionEndsAt`, `isBlocked`

### Authentication (NextAuth v5)
- **Dual config pattern**: `src/auth.config.ts` (Edge-compatible, no Prisma) + `src/auth.ts` (full server config)
- **Providers**: Google OAuth (auto-registers tenant), Credentials (email/phone + password)
- **Google sign-in flow**: Auto-creates tenant → default store → treasury accounts
- **JWT strategy**: Custom fields injected via callbacks, backward-compatible with old sessions

### Server Actions Pattern (`src/actions/`)
- All marked with `"use server"` directive
- Fetch session via `auth()`, extract `tenantId` for multi-tenancy
- Return `{ success/error, data }` objects (never throw to client)
- Use `revalidatePath()` for ISR cache invalidation
- Permission checks via `requirePermission()` from `src/lib/rbac.ts`

### Treasury as Financial Source of Truth
- **Critical**: All financial flows (sales, purchases, expenses) create `TreasuryTransaction` entries
- No separate Payment model - payments are treasury transactions with `source` field
- Account types: `CAISSE` (cash register), `BANK` (bank account)
- Transaction types: `CREDIT` (money in), `DEBIT` (money out)
- Each transaction stores balance snapshot for audit trail

### Redis Caching (`src/lib/redis.ts`)
- Singleton pattern with graceful fallback (app works without Redis)
- `withCache(key, fn, ttl)` - get cached or compute & cache
- `invalidateCache(prefix)` - bulk delete by key prefix
- 5-second connection timeout, 3 retry limit
- Used for expensive queries (products, categories, analytics)

### Internationalization (next-intl)
- Locales: `en`, `fr` (default), `ar`
- Prefix: `always` (URLs like `/fr/dashboard`, `/en/dashboard`)
- Config: `src/i18n/routing.ts`
- Use `createNavigation()` for locale-aware `Link`, `redirect`, `useRouter`

### State Management
- **Zustand** for POS cart only (`src/hooks/use-pos-store.ts`)
- Multi-session support (multiple orders in parallel)
- Persisted to localStorage with `createJSONStorage`
- Auto-recalculates prices on client type change (RETAIL/RESELLER/WHOLESALE)
- No Redux or Context API - most data fetched server-side

### Algerian Tax Compliance
- Tax regimes: `G50` (TVA/VAT) or `G12` (IFU)
- Supplier withholding tax: 0%, 10%, 15%, 24% (retenue à la source)
- Withholding calculated at purchase order creation, stored in `PurchaseOrder.withholdingAmount`
- Stamp tax (`stampTaxEnabled`), TAP (`tapRate`) configurable per tenant
- Tax reports: `src/actions/g50.ts`, `src/actions/g12.ts`

## Key Database Models

### Core Multi-Tenant
- `Tenant` - Business entity with subscription, tax config, API keys
- `User` - Team members with roles (ADMIN, MANAGER, CASHIER, VENDEUR, ACCOUNTANT, STOCK_MANAGER)
- `Store` - Multiple locations per tenant

### Inventory
- `Product` - SKU with 3 pricing tiers (retail/dealer/wholesale), cost, images, barcode
- `Category`, `Brand` - Hierarchical organization
- `StockMovement` - Audit trail of all stock changes
- `Spoilage` - Waste tracking

### Sales & Orders
- `Order` - POS transactions (cash register sales)
- `SalesOrder` - B2B invoices (Bon de Livraison)
- Both have `OrderItem`/`SalesOrderItem` with price/TVA snapshots

### Purchasing
- `Supplier` - Vendor info (NIF, NIS, RIB, withholding tax rate)
- `PurchaseOrder` - Supplier orders with withholding tax calculation
- `PurchaseOrderItem` - Line items with cost & TVA

### Financial
- `TreasuryAccount` - Cash registers, bank accounts
- `TreasuryTransaction` - Ledger entries with balance snapshots
- `Expense`, `ExpenseCategory` - Operating costs
- `DailyClose` - End-of-day reconciliation

### Other
- `Customer` - Clients with loyalty points, client type (RETAIL/RESELLER/WHOLESALE)
- `Promotion` - Discounts & campaigns
- `RecurringInvoice` - Subscription billing
- `DeliveryShipment`, `DeliveryTour`, `TruckLoad` - Logistics
- `AuditLog` - Compliance trail
- `SequenceCounter` - Invoice numbering per tenant

## Environment Variables

### Required
```bash
NEXTAUTH_SECRET=<jwt-signing-key>
DATABASE_URL=postgresql://user:pass@host:5432/syncloudpos
```

### Optional
```bash
REDIS_URL=redis://localhost:6379
GOOGLE_CLIENT_ID=<oauth-client-id>
GOOGLE_CLIENT_SECRET=<oauth-secret>
WHATSAPP_TOKEN=<whatsapp-api-token>
WHATSAPP_PHONE_ID=<whatsapp-phone-id>
GEMINI_API_KEY=<google-ai-key>
SUPERADMIN_WHATSAPP=<admin-phone>
```

### Docker-Injected
```bash
NEXTAUTH_URL=http://localhost:3000
AUTH_URL=http://localhost:3000
SYNCLOUDPOS_MODE=local  # or "cloud"
MACHINE_ID=<license-machine-id>
LICENSE_FILE=<license-path>
```

## Important Patterns & Conventions

### When Writing Server Actions
1. Always fetch session: `const session = await auth()`
2. Extract tenantId: `const tenantId = session?.user?.tenantId`
3. Filter all queries by tenantId
4. Check permissions: `await requirePermission(session, 'permission_name')`
5. Use `revalidatePath()` after mutations
6. Return `{ success: true, data }` or `{ error: 'message' }`

### When Working with Treasury
- Never create standalone payment records
- Always create `TreasuryTransaction` for financial flows
- Set `source` field: `SALE`, `PURCHASE`, `EXPENSE`, `MANUAL_IN`, `MANUAL_OUT`
- Store balance snapshot in transaction for audit trail
- Link to related entity via `orderId`, `salesOrderId`, `purchaseOrderId`, `expenseId`

### When Working with Products
- Three pricing tiers: `retailPrice`, `dealerPrice`, `wholesalePrice`
- Client type determines which price to use
- Cost stored separately for margin calculation
- Stock tracked via `StockMovement` (never modify `Product.stock` directly)

### When Working with Orders
- `Order` = POS sales (cash register)
- `SalesOrder` = B2B invoices (Bon de Livraison)
- `PurchaseOrder` = Supplier orders
- All have status workflow: PENDING → CONFIRMED → DELIVERED/COMPLETED → CANCELLED
- Invoice numbers from `SequenceCounter` (per tenant, per type)

### When Working with Taxes
- TVA (VAT) rates stored per product
- Withholding tax calculated at purchase order level
- G50 reports for TVA regime tenants
- G12 reports for IFU regime tenants
- Stamp tax and TAP configurable per tenant

## File Structure

```
src/
├── actions/           # Server actions (50+ files)
├── app/
│   ├── [locale]/     # Locale-based routing
│   │   ├── (auth)/   # Login/register
│   │   └── (dashboard)/  # Main app modules
│   └── api/          # API routes (NextAuth, mobile, webhooks)
├── components/       # React components (organized by feature)
├── hooks/           # Custom hooks (use-pos-store.ts)
├── lib/             # Utilities (redis.ts, rbac.ts, utils.ts)
├── i18n/            # Internationalization config
└── auth.ts          # NextAuth config

prisma/
└── schema.prisma    # Database schema

docker-compose.yml   # PostgreSQL + Redis + App
Dockerfile          # Multi-stage build
```

## Testing & Deployment

### Before Committing
1. Run linter: `npm run lint`
2. Test build: `npm run build`
3. Check Prisma schema: `npx prisma validate`

### Deployment
- Docker-based deployment (see docker-compose.yml)
- Migrations run automatically via `docker-entrypoint.sh`
- Health check endpoint: `/api/health`
- Production URL: https://chirpedbeo.online

## Common Gotchas

1. **Always filter by tenantId** - Forgetting this leaks data across tenants
2. **Use treasury transactions for payments** - Don't create separate payment models
3. **Redis is optional** - Code must work without Redis (graceful fallback)
4. **Edge-compatible auth config** - `auth.config.ts` cannot import Prisma
5. **Locale prefix required** - No automatic locale detection, users must choose
6. **Withholding tax at order creation** - Not at payment time
7. **Stock via StockMovement** - Never modify `Product.stock` directly
8. **Invoice numbers from SequenceCounter** - Ensures uniqueness per tenant
