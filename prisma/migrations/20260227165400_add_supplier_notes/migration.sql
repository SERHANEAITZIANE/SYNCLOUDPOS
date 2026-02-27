-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN "notes" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "taxId" TEXT,
    "notes" TEXT,
    "barcode" TEXT,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "balance" DECIMAL NOT NULL DEFAULT 0,
    "tenantId" TEXT NOT NULL,
    "clientType" TEXT NOT NULL DEFAULT 'RETAIL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("address", "balance", "city", "createdAt", "email", "id", "loyaltyPoints", "name", "notes", "phone", "taxId", "tenantId", "updatedAt") SELECT "address", "balance", "city", "createdAt", "email", "id", "loyaltyPoints", "name", "notes", "phone", "taxId", "tenantId", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE UNIQUE INDEX "Customer_barcode_key" ON "Customer"("barcode");
CREATE TABLE "new_Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ownerName" TEXT,
    "activity" TEXT,
    "address" TEXT,
    "wilaya" TEXT,
    "commune" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "email" TEXT,
    "nif" TEXT,
    "rc" TEXT,
    "artImposition" TEXT,
    "nis" TEXT,
    "bankAccount" TEXT,
    "logo" TEXT,
    "headerText" TEXT,
    "blTemplate" TEXT DEFAULT 'standard',
    "subscriptionEndsAt" DATETIME,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Tenant" ("activity", "address", "artImposition", "bankAccount", "commune", "createdAt", "email", "fax", "headerText", "id", "logo", "name", "nif", "nis", "ownerName", "phone", "rc", "updatedAt", "wilaya") SELECT "activity", "address", "artImposition", "bankAccount", "commune", "createdAt", "email", "fax", "headerText", "id", "logo", "name", "nif", "nis", "ownerName", "phone", "rc", "updatedAt", "wilaya" FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "isSuperadmin" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'CASHIER',
    "tenantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "password", "role", "tenantId", "updatedAt") SELECT "createdAt", "email", "id", "name", "password", "role", "tenantId", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
