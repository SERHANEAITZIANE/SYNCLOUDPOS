"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { ClientType } from "@prisma/client"
import { logAudit } from "./audit-log"

interface CustomerData {
    name: string
    phone?: string
    email?: string
    address?: string
    city?: string
    taxId?: string
    nif?: string
    nis?: string
    artImposition?: string
    rc?: string
    rib?: string
    barcode?: string
    notes?: string
    clientType?: ClientType
    balance?: number
    initialBalance?: number
}

export const getCustomers = async (page: number = 1, pageSize: number = 20, search?: string, includeArchived: boolean = false) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized", customers: [], totalCount: 0 }

    const tenantId = session.user.tenantId

    if (!tenantId) return { error: "Tenant ID missing from session", customers: [], totalCount: 0 }

    try {
        const whereClause: any = { tenantId }
        if (!includeArchived) {
            whereClause.isArchived = false
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { nif: { contains: search, mode: 'insensitive' } }
            ]
        }

        const [customers, totalCount] = await Promise.all([
            db.customer.findMany({
                where: whereClause,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.customer.count({ where: whereClause })
        ])

        return { customers, totalCount }
    } catch (_error) {
        return { error: "Failed to fetch customers", customers: [], totalCount: 0 }
    }
}

export const createCustomer = async (data: CustomerData) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const tenantId = session.user.tenantId

    try {
        const initialBal = data.initialBalance ?? data.balance ?? 0
        const customer = await db.customer.create({
            data: {
                name: data.name,
                phone: data.phone || null,
                email: data.email || null,
                address: data.address || null,
                city: data.city || null,
                taxId: data.taxId || null,
                nif: data.nif || null,
                nis: data.nis || null,
                artImposition: data.artImposition || null,
                rc: data.rc || null,
                rib: data.rib || null,
                barcode: data.barcode || null,
                notes: data.notes || null,
                clientType: data.clientType || ClientType.RETAIL,
                balance: initialBal,
                initialBalance: initialBal,
                tenantId
            }
        })
        revalidatePath("/(dashboard)/customers")
        logAudit({
            action: "CREATE",
            entity: "CUSTOMER",
            entityId: customer.id,
            description: `Client créé : ${data.name} (${data.clientType}, Solde: ${initialBal} DA)`,
            after: { name: data.name, clientType: data.clientType, balance: initialBal }
        }).catch(() => null)
        return { success: "Customer created", id: customer.id }
    } catch (error) {
        console.error("createCustomer error:", error)
        return { error: `Failed to create customer: ${error instanceof Error ? error.message : String(error)}` }
    }
}

export const updateCustomer = async (id: string, data: CustomerData) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing from session" }

    try {
        const existingCustomer = await db.customer.findUnique({
            where: { id, tenantId }
        })
        if (!existingCustomer) return { error: "Customer not found" }

        // Sanitize: convert empty strings to null/undefined for optional fields
        // This prevents unique constraint violations (e.g. barcode @unique with "")
        const sanitize = (val: string | undefined | null): string | null => {
            if (val === undefined || val === null || val === "") return null
            return val
        }

        const newInitialBalance = data.initialBalance ?? 0
        const oldInitialBalance = existingCustomer.initialBalance ? Number(existingCustomer.initialBalance) : 0
        const delta = newInitialBalance - oldInitialBalance
        const newBalance = Number(existingCustomer.balance) + delta

        const customer = await db.customer.update({
            where: { id, tenantId },
            data: {
                name: data.name,
                phone: sanitize(data.phone),
                email: sanitize(data.email),
                address: sanitize(data.address),
                city: sanitize(data.city),
                taxId: sanitize(data.taxId),
                nif: sanitize(data.nif),
                nis: sanitize(data.nis),
                artImposition: sanitize(data.artImposition),
                rc: sanitize(data.rc),
                rib: sanitize(data.rib),
                barcode: sanitize(data.barcode) || null,
                notes: sanitize(data.notes),
                clientType: data.clientType || ClientType.RETAIL,
                balance: newBalance,
                initialBalance: newInitialBalance
            }
        })
        revalidatePath("/(dashboard)/customers")
        logAudit({
            action: "UPDATE",
            entity: "CUSTOMER",
            entityId: id,
            description: `Client mis à jour : ${data.name}`,
            before: {
                name: existingCustomer.name,
                clientType: existingCustomer.clientType,
                balance: existingCustomer.balance ? Number(existingCustomer.balance) : 0
            },
            after: {
                name: data.name,
                clientType: data.clientType,
                balance: newBalance
            }
        }).catch(() => null)
        return { success: "Customer updated", id: customer.id }
    } catch (error: any) {
        console.error("updateCustomer error:", error)
        return { error: `Failed to update customer: ${error?.message || String(error)}` }
    }
}

export const deleteCustomer = async (id: string) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing from session" }

    try {
        const existingCustomer = await db.customer.findFirst({
            where: { id, tenantId }
        })

        await db.customer.update({
            where: { id, tenantId },
            data: { isArchived: true }
        })
        revalidatePath("/(dashboard)/customers")
        logAudit({
            action: "DELETE",
            entity: "CUSTOMER",
            entityId: id,
            description: `Client supprimé : ${existingCustomer?.name || id}`,
            before: {
                name: existingCustomer?.name,
                clientType: existingCustomer?.clientType,
                balance: existingCustomer?.balance ? Number(existingCustomer.balance) : 0
            }
        }).catch(() => null)
        return { success: "Customer deleted" }
    } catch (_error) {
        return { error: "Failed to delete customer" }
    }
}

export const importCustomers = async (rows: Record<string, string>[]) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing from session" }

    // Helper to parse messy number strings like "17,000.00 DA" or "1 500"
    const parseNumeric = (val: string | undefined | null | number) => {
        if (val === undefined || val === null || val === "") return 0
        if (typeof val === "number") return val
        let clean = String(val).replace(/[^0-9.,-]/g, "")
        if (clean.includes(",") && clean.includes(".")) {
            const lastComma = clean.lastIndexOf(",")
            const lastDot = clean.lastIndexOf(".")
            if (lastComma > lastDot) {
                clean = clean.replace(/\./g, "").replace(",", ".")
            } else {
                clean = clean.replace(/,/g, "")
            }
        } else if (clean.includes(",")) {
            clean = clean.replace(/,/g, ".")
        }
        const parsed = parseFloat(clean)
        return isNaN(parsed) ? 0 : parsed
    }

    // Helper to resolve a value from multiple possible column names
    const resolve = (row: Record<string, string>, ...keys: string[]): string => {
        for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
                return String(row[key]).trim()
            }
        }
        return ""
    }

    // Helper to determine client type
    const resolveClientType = (val: string): ClientType => {
        const v = val.toLowerCase().trim()
        if (["reseller", "revendeur", "grossiste-revendeur"].includes(v)) return ClientType.RESELLER
        if (["wholesale", "grossiste", "gros"].includes(v)) return ClientType.WHOLESALE
        return ClientType.RETAIL
    }

    const validRows = rows.filter(r => {
        const name = resolve(r, "name", "nom", "Nom", "Name", "Nom Client", "nom client", "NOM", "client", "Client", "RAISON SOCIALE", "Raison Sociale", "raison sociale")
        return name.length > 0
    })
    const errors = rows.length - validRows.length

    const createData = validRows.map(row => {
        const name = resolve(row, "name", "nom", "Nom", "Name", "Nom Client", "nom client", "NOM", "client", "Client", "RAISON SOCIALE", "Raison Sociale", "raison sociale")
        const phone = resolve(row, "phone", "téléphone", "telephone", "Téléphone", "Telephone", "tel", "Tel", "TEL", "Mobile", "mobile", "N° Téléphone", "numéro")
        const email = resolve(row, "email", "Email", "EMAIL", "e-mail", "E-mail", "Mail", "mail")
        const address = resolve(row, "address", "adresse", "Adresse", "ADRESSE", "Adresse Complète")
        const city = resolve(row, "city", "ville", "Ville", "VILLE", "Wilaya", "wilaya", "commune", "Commune")
        const nif = resolve(row, "nif", "NIF", "Nif", "N° Identification Fiscale")
        const nis = resolve(row, "nis", "NIS", "Nis", "N° Identification Statistique")
        const artImposition = resolve(row, "artImposition", "Article Imposition", "Art Imposition", "article imposition", "AI", "Art. Imp.")
        const rc = resolve(row, "rc", "RC", "Rc", "Registre Commerce", "registre commerce", "N° RC")
        const rib = resolve(row, "rib", "RIB", "Rib", "N° Compte Bancaire", "Compte Bancaire")
        const taxId = resolve(row, "taxId", "Tax ID", "tax_id", "identifiant fiscal")
        const notes = resolve(row, "notes", "Notes", "NOTES", "Observation", "observation", "Remarque", "remarque", "note")
        const clientTypeRaw = resolve(row, "clientType", "Type Client", "type client", "Type", "type", "client_type", "catégorie", "Catégorie")
        const balanceRaw = resolve(row, "balance", "solde", "Solde", "SOLDE", "solde initial", "Solde Initial", "Solde Client", "solde client", "Dette", "dette", "Crédit", "crédit")

        return {
            name,
            phone: phone || undefined,
            email: email || undefined,
            address: address || undefined,
            city: city || undefined,
            nif: nif || undefined,
            nis: nis || undefined,
            artImposition: artImposition || undefined,
            rc: rc || undefined,
            rib: rib || undefined,
            taxId: taxId || undefined,
            notes: notes || undefined,
            clientType: resolveClientType(clientTypeRaw),
            balance: parseNumeric(balanceRaw),
            initialBalance: parseNumeric(balanceRaw),
            barcode: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
            tenantId
        }
    })

    let created = 0
    try {
        const batchSize = 50
        for (let i = 0; i < createData.length; i += batchSize) {
            const batch = createData.slice(i, i + batchSize)
            const result = await db.customer.createMany({ data: batch, skipDuplicates: true })
            created += result.count
        }
    } catch (error) {
        console.error("importCustomers error:", error)
        return { error: `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}` }
    }

    revalidatePath("/(dashboard)/customers")
    logAudit({
        action: "IMPORT",
        entity: "CUSTOMER",
        description: `Importation de ${created} clients (${errors} lignes invalides)`,
        after: { count: created, errors }
    }).catch(() => null)
    return { success: `${created} client(s) importé(s)`, errors }
}

export const getUnpaidCustomers = async () => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing" }

    try {
        const customers = await db.customer.findMany({
            where: { tenantId, balance: { gt: 0 } },
            orderBy: { balance: "desc" }
        })
        return { customers: JSON.parse(JSON.stringify(customers)) }
    } catch (_error) {
        return { error: "Failed to fetch unpaid customers" }
    }
}

export const registerCustomerPayment = async (data: { customerId: string; amount: number; accountId: string; notes?: string; date?: Date | string }) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing" }

    try {
        await db.$transaction(async (tx) => {
            // 1. Decrease customer balance
            await tx.customer.update({
                where: { id: data.customerId },
                data: { balance: { decrement: data.amount } }
            });

            // 2. Increase Treasury Account balance
            const account = await tx.treasuryAccount.update({
                where: { id: data.accountId },
                data: { balance: { increment: data.amount } }
            });

            // 3. Log transaction
            await tx.treasuryTransaction.create({
                data: {
                    tenantId,
                    accountId: data.accountId,
                    type: "CREDIT",
                    amount: data.amount,
                    balanceBefore: Number(account.balance) - data.amount,
                    balanceAfter: account.balance,
                    source: "CUSTOMER_PAYMENT",
                    referenceId: data.customerId, // Link to customer
                    description: `Paiement Client: ${data.notes || "Règlement de dette"}`,
                    date: data.date ? new Date(data.date) : new Date(),
                }
            });
        });

        revalidatePath("/(dashboard)/customers")
        revalidatePath("/(dashboard)/treasury")
        logAudit({
            action: "CREATE",
            entity: "PAYMENT",
            description: `Règlement client : ${data.amount} DA reçu pour ${data.notes || "règlement de dette"} (Compte ID: ${data.accountId})`,
            after: { customerId: data.customerId, amount: data.amount, accountId: data.accountId, notes: data.notes }
        }).catch(() => null)
        return { success: "Payment registered successfully" }
    } catch (error) {
        console.error("registerCustomerPayment error:", error)
        return { error: "Failed to register payment" }
    }
}

export const registerCustomerLoan = async (data: { customerId: string; amount: number; accountId: string; notes?: string; date?: Date | string }) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing" }

    try {
        const result = await db.$transaction(async (tx) => {
            // Get the customer info for the description
            const customer = await tx.customer.findUnique({ where: { id: data.customerId } })

            // Get the treasury account
            const account = await tx.treasuryAccount.findUnique({ where: { id: data.accountId, tenantId } })
            if (!account) throw new Error("Compte de trésorerie introuvable")

            // Ensure there are enough funds
            if (Number(account.balance) < data.amount) {
                throw new Error("Fonds insuffisants dans la caisse/banque sélectionnée")
            }

            // Increase customer balance (adds to their debt — they now owe more)
            await tx.customer.update({
                where: { id: data.customerId },
                data: {
                    balance: { increment: data.amount },
                    notes: [
                        customer?.notes,
                        `[EMPRUNT ${new Date().toLocaleDateString("fr-FR")}] ${data.amount} DA - ${data.notes || "Avance accordée"}`
                    ].filter(Boolean).join("\n")
                }
            })

            // Decrement treasury account balance
            const updatedAccount = await tx.treasuryAccount.update({
                where: { id: data.accountId },
                data: {
                    balance: { decrement: data.amount }
                }
            })

            // Create Treasury transaction
            await tx.treasuryTransaction.create({
                data: {
                    accountId: data.accountId,
                    type: "DEBIT",
                    amount: data.amount,
                    balanceBefore: account.balance,
                    balanceAfter: updatedAccount.balance,
                    source: "MANUAL_OUT",
                    referenceId: data.customerId,
                    description: `Prêt accordé au client: ${customer?.name || "Inconnu"}`,
                    tenantId
                }
            })

            return { success: "Emprunt enregistré avec succès" }
        })

        revalidatePath("/(dashboard)/customers")
        revalidatePath("/(dashboard)/emprunt")
        logAudit({
            action: "CREATE",
            entity: "LOAN",
            description: `Emprunt client : ${data.amount} DA accordé (Compte ID: ${data.accountId})`,
            after: { customerId: data.customerId, amount: data.amount, accountId: data.accountId, notes: data.notes }
        }).catch(() => null)
        return { success: "Loan registered successfully" }
    } catch (error) {
        console.error("registerCustomerLoan error:", error)
        return { error: "Failed to register loan" }
    }
}

export const getCustomerLoans = async (customerId?: string) => {
    const session = await auth()
    if (!session?.user?.id) return []
    const tenantId = session.user.tenantId
    if (!tenantId) return []

    try {
        // Fetch all customer IDs to cross-reference (or filter by specific customer)
        const customerWhere: any = { tenantId }
        if (customerId && customerId !== "ALL") {
            customerWhere.id = customerId
        }
        
        const customers = await db.customer.findMany({
            where: customerWhere,
            select: { id: true, name: true }
        })
        
        const customerIds = customers.map(c => c.id)

        // Customer loans are MANUAL_OUT transactions linked to a customer
        const transactions = await db.treasuryTransaction.findMany({
            where: {
                tenantId,
                source: "MANUAL_OUT",
                referenceId: { in: customerIds }
            },
            include: {
                account: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { date: "desc" }
        })

        const loans = transactions.map(t => {
            const customer = customers.find(c => c.id === t.referenceId)
            return {
                id: t.id,
                date: t.date.toISOString(),
                amount: Number(t.amount),
                source: t.source,
                description: t.description || "",
                customerName: customer?.name || "Inconnu",
                customerId: t.referenceId as string,
                accountId: t.accountId,
                accountName: t.account?.name || "Inconnu"
            }
        })

        return loans
    } catch (error) {
        console.error("[GET_CUSTOMER_LOANS] error:", error)
        return []
    }
}

// Lightweight list for select dropdowns
export async function getCustomersForSelect() {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Non autorisé" }
    const customers = await db.customer.findMany({
        where: { tenantId: session.user.tenantId },
        select: { id: true, name: true, phone: true, clientType: true },
        orderBy: { name: "asc" },
    })
    return { data: customers }
}
