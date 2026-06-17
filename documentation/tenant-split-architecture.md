# Architectural Proposal: Tenant Table Splitting

This document details the database schema migration and application refactoring strategy to split the bloated `Tenant` model into modular, domain-specific configuration tables.

## Motivation
The current `Tenant` table has 55+ columns, mixing core business details (name, address, RC, NIF) with various external credentials (API keys, SMTP passwords, tokens).
* **Security**: Loading the `Tenant` record via `auth()` or general queries exposes sensitive SMTP passwords and AI API keys to client payloads or unused server action scopes.
* **Performance**: A large row footprint increases the memory overhead of the query cache.
* **Maintainability**: Separating these configuration areas maps clearly to settings panels.

---

## 1. Proposed Prisma Schema Additions

Add these new tables to [schema.prisma](file:///c:/Users/tre/Documents/SYNCLOUDPOS/prisma/schema.prisma) and configure one-to-one relations with `Tenant`:

```prisma
model TenantAiConfig {
  id              String   @id @default(uuid())
  tenantId        String   @unique
  aiProvider      String   @default("GEMINI")
  aiModel         String   @default("gemini-1.5-flash")
  geminiApiKey    String?
  openaiApiKey    String?
  anthropicApiKey String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}

model TenantWhatsAppConfig {
  id              String   @id @default(uuid())
  tenantId        String   @unique
  whatsappToken   String?
  whatsappPhoneId String?
  whatsappPhone   String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}

model TenantSmtpConfig {
  id        String   @id @default(uuid())
  tenantId  String   @unique
  smtpHost  String?
  smtpPort  String?
  smtpUser  String?
  smtpPass  String?
  smtpFrom  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}

model TenantLogisticsConfig {
  id               String   @id @default(uuid())
  tenantId         String   @unique
  yalidineApiId    String?
  yalidineApiToken String?
  dhdApiToken      String?
  hddApiToken      String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  tenant           Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}
```

And update the existing `Tenant` model to link them:

```prisma
model Tenant {
  id                   String                 @id @default(uuid())
  name                 String
  // ... core fields ...
  
  // Relations
  aiConfig             TenantAiConfig?
  whatsappConfig       TenantWhatsAppConfig?
  smtpConfig           TenantSmtpConfig?
  logisticsConfig      TenantLogisticsConfig?
  
  // ... other relations ...
}
```

---

## 2. PostgreSQL Data Migration Script

Save this script as `prisma/migrations/migrate_tenant_configs.sql`. It safely migrates existing tenant configurations and drops the deprecated columns from `Tenant`:

```sql
-- 1. Create TenantAiConfig table and copy data
CREATE TABLE "TenantAiConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL UNIQUE,
    "aiProvider" TEXT NOT NULL DEFAULT 'GEMINI',
    "aiModel" TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
    "geminiApiKey" TEXT,
    "openaiApiKey" TEXT,
    "anthropicApiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantAiConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "TenantAiConfig" ("id", "tenantId", "aiProvider", "aiModel", "geminiApiKey", "openaiApiKey", "anthropicApiKey", "updatedAt")
SELECT 
    gen_random_uuid()::text, 
    "id", 
    coalesce("aiProvider", 'GEMINI'), 
    coalesce("aiModel", 'gemini-1.5-flash'), 
    "geminiApiKey", 
    "openaiApiKey", 
    "anthropicApiKey", 
    "updatedAt"
FROM "Tenant";

-- 2. Create TenantWhatsAppConfig table and copy data
CREATE TABLE "TenantWhatsAppConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL UNIQUE,
    "whatsappToken" TEXT,
    "whatsappPhoneId" TEXT,
    "whatsappPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantWhatsAppConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "TenantWhatsAppConfig" ("id", "tenantId", "whatsappToken", "whatsappPhoneId", "whatsappPhone", "updatedAt")
SELECT 
    gen_random_uuid()::text, 
    "id", 
    "whatsappToken", 
    "whatsappPhoneId", 
    "whatsappPhone", 
    "updatedAt"
FROM "Tenant";

-- 3. Create TenantSmtpConfig table and copy data
CREATE TABLE "TenantSmtpConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL UNIQUE,
    "smtpHost" TEXT,
    "smtpPort" TEXT,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "smtpFrom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantSmtpConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "TenantSmtpConfig" ("id", "tenantId", "smtpHost", "smtpPort", "smtpUser", "smtpPass", "smtpFrom", "updatedAt")
SELECT 
    gen_random_uuid()::text, 
    "id", 
    "smtpHost", 
    "smtpPort", 
    "smtpUser", 
    "smtpPass", 
    "smtpFrom", 
    "updatedAt"
FROM "Tenant";

-- 4. Create TenantLogisticsConfig table and copy data
CREATE TABLE "TenantLogisticsConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL UNIQUE,
    "yalidineApiId" TEXT,
    "yalidineApiToken" TEXT,
    "dhdApiToken" TEXT,
    "hddApiToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantLogisticsConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "TenantLogisticsConfig" ("id", "tenantId", "yalidineApiId", "yalidineApiToken", "dhdApiToken", "hddApiToken", "updatedAt")
SELECT 
    gen_random_uuid()::text, 
    "id", 
    "yalidineApiId", 
    "yalidineApiToken", 
    "dhdApiToken", 
    "hddApiToken", 
    "updatedAt"
FROM "Tenant";

-- 5. Drop deprecated columns from Tenant
ALTER TABLE "Tenant" 
    DROP COLUMN "aiProvider",
    DROP COLUMN "aiModel",
    DROP COLUMN "geminiApiKey",
    DROP COLUMN "openaiApiKey",
    DROP COLUMN "anthropicApiKey",
    DROP COLUMN "whatsappToken",
    DROP COLUMN "whatsappPhoneId",
    DROP COLUMN "whatsappPhone",
    DROP COLUMN "smtpHost",
    DROP COLUMN "smtpPort",
    DROP COLUMN "smtpUser",
    DROP COLUMN "smtpPass",
    DROP COLUMN "smtpFrom",
    DROP COLUMN "yalidineApiId",
    DROP COLUMN "yalidineApiToken",
    DROP COLUMN "dhdApiToken",
    DROP COLUMN "hddApiToken";
```

---

## 3. Recommended Query Refactoring

### Fetching settings with relations
To fetch a tenant's settings (for example, on the settings dashboard), use Prisma's `include`:
```typescript
const tenantSettings = await db.tenant.findUnique({
    where: { id: tenantId },
    include: {
        aiConfig: true,
        whatsappConfig: true,
        smtpConfig: true,
        logisticsConfig: true
    }
});
```

### Fetching specific configuration in Server Actions
If you only need AI configurations (e.g. for forecasting or voice assistants), fetch the configuration table directly:
```typescript
const aiConfig = await db.tenantAiConfig.findUnique({
    where: { tenantId }
});
const apiKey = aiConfig?.geminiApiKey || process.env.GEMINI_API_KEY;
```

---

## 4. Key Files to Modify During Implementation

* **Settings API / Action**: `src/actions/settings.ts` — Update settings upsert logic.
* **Settings Forms**:
  * `src/app/[locale]/(dashboard)/settings/components/ai-settings-form.tsx`
  * `src/app/[locale]/(dashboard)/settings/components/system-settings-form.tsx`
* **AI Utilities**: `src/lib/ai-providers.ts`
* **Logistics Integration**: `src/lib/yalidine.ts` (or corresponding shipping modules).
* **Voice Assistant Route**: `src/app/api/mobile/voice-assistant/route.ts`
