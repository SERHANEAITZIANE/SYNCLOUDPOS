"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auth } from "@/auth"

interface SupplierData {
    name: string
    contactPerson?: string
    phone?: string
    email?: string
    address?: string
    taxId?: string
    nif?: string
    nis?: string
    artImposition?: string
    rc?: string
    rib?: string
    balance?: number
    notes?: string
}

export const getSuppliers = async (page: number = 1, pageSize: number = 20, search?: string, filterOutstanding?: boolean) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized", suppliers: [], totalCount: 0 }

    const tenantId = session.user.tenantId

    if (!tenantId) return { error: "Tenant ID missing from session", suppliers: [], totalCount: 0 }

    try {
        const whereClause: any = { tenantId }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { contactPerson: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ]
        }

        if (filterOutstanding) {
            whereClause.balance = { gt: 0 }
        }

        const [suppliers, totalCount] = await Promise.all([
            db.supplier.findMany({
                where: whereClause,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.supplier.count({ where: whereClause })
        ])

        return { suppliers, totalCount }
    } catch (_error) {
        return { error: "Failed to fetch suppliers", suppliers: [], totalCount: 0 }
    }
}

export const createSupplier = async (data: SupplierData) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const tenantId = session.user.tenantId

    if (!tenantId) return { error: "Tenant ID missing from session" }

    try {
        const supplier = await db.supplier.create({
            data: {
                ...data,
                tenantId
            }
        })
        revalidatePath("/(dashboard)/suppliers")
        return { success: "Supplier created", id: supplier.id }
    } catch (error) {
        console.error("createSupplier error:", error)
        return { error: `Failed to create supplier: ${error instanceof Error ? error.message : String(error)}` }
    }
}

export const updateSupplier = async (id: string, data: SupplierData) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing from session" }

    try {
        const { balance, ...rest } = data
        const supplier = await db.supplier.update({
            where: { id, tenantId },
            data: rest
        })
        revalidatePath("/(dashboard)/suppliers")
        return { success: "Supplier updated", id: supplier.id }
    } catch (_error) {
        return { error: "Failed to update supplier" }
    }
}

export const deleteSupplier = async (id: string) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing from session" }

    try {
        await db.supplier.delete({
            where: { id, tenantId }
        })
        revalidatePath("/(dashboard)/suppliers")
        return { success: "Supplier deleted" }
    } catch (_error) {
        return { error: "Failed to delete supplier" }
    }
}

export const importSuppliers = async (rows: SupplierData[]) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing from session" }

    const validRows = rows.filter(r => r.name?.trim())
    const errors = rows.length - validRows.length

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

    const createData = validRows.map(row => {
        const balanceInput = (row as any)["balance"] || (row as any)["solde"] || (row as any)["Solde"] || (row as any)["solde initial"] || (row as any)["Solde Initial"] || 0;

        return {
            name: row.name.trim(),
            contactPerson: row.contactPerson || undefined,
            phone: row.phone || undefined,
            email: row.email || undefined,
            address: row.address || undefined,
            nif: row.nif || undefined,
            nis: row.nis || undefined,
            artImposition: row.artImposition || undefined,
            rc: row.rc || undefined,
            rib: row.rib || undefined,
            balance: parseNumeric(balanceInput),
            tenantId
        }
    })

    let created = 0
    try {
        const batchSize = 50
        for (let i = 0; i < createData.length; i += batchSize) {
            const batch = createData.slice(i, i + batchSize)
            const result = await db.supplier.createMany({ data: batch, skipDuplicates: true })
            created += result.count
        }
    } catch (error) {
        console.error("importSuppliers error:", error)
    }

    revalidatePath("/(dashboard)/suppliers")
    return { success: `${created} fournisseurs importés`, errors }
}

export const registerSupplierPayment = async (data: {
    supplierId: string
    amount: number
    accountId: string
    notes?: string
    date?: string
    imageUrl?: string
}) => {
    try {
        const session = await auth()
        if (!session?.user?.id) return { error: "Unauthorized" }

        const tenantId = session.user.tenantId

        const transactionResult = await db.$transaction(async (tx) => {
            const account = await tx.treasuryAccount.findUnique({
                where: { id: data.accountId, tenantId }
            })

            if (!account) throw new Error("Caisse non trouvée")

            // 2. Decrement supplier balance
            await tx.supplier.update({
                where: { id: data.supplierId, tenantId },
                data: {
                    balance: {
                        decrement: data.amount // Debt decreases when we pay them (or goes negative if advance)
                    }
                }
            })

            // 3. Create Treasury Transaction OUT
            await tx.treasuryTransaction.create({
                data: {
                    tenantId,
                    accountId: data.accountId,
                    type: "DEBIT", // Money leaving our treasury
                    amount: data.amount,
                    balanceBefore: Number(account.balance), // Before this txn
                    balanceAfter: Number(account.balance) - data.amount, // After
                    source: "MANUAL_OUT",
                    referenceId: data.supplierId, // Link to supplier for history
                    description: `Paiement Fournisseur: ${data.notes || "Règlement"}`,
                    imageUrl: data.imageUrl || undefined,
                    date: data.date ? new Date(data.date) : new Date(),
                }
            })

            // 4. Update the treasury account balance
            await tx.treasuryAccount.update({
                where: { id: data.accountId, tenantId },
                data: {
                    balance: {
                        decrement: data.amount
                    }
                }
            })

            return { success: "Paiement enregistré avec succès" }
        })

        revalidatePath("/(dashboard)/suppliers")
        return transactionResult

    } catch (error) {
        console.error("[REGISTER_SUPPLIER_PAYMENT]", error)
        return { error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement du paiement" }
    }
}

export const registerSupplierLoan = async (data: { supplierId: string; amount: number; accountId: string; notes?: string; date?: Date | string }) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing" }

    try {
        const result = await db.$transaction(async (tx) => {
            const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId, tenantId } })

            // Get the treasury account
            const account = await tx.treasuryAccount.findUnique({ where: { id: data.accountId, tenantId } })
            if (!account) throw new Error("Compte de trésorerie introuvable")

            // Increase supplier balance (we owe them more — they gave us an advance)
            // Also append a tagged note entry for loan history tracking
            await tx.supplier.update({
                where: { id: data.supplierId },
                data: {
                    balance: { increment: data.amount },
                    notes: [
                        supplier?.notes,
                        `[EMPRUNT ${new Date().toLocaleDateString("fr-FR")}] ${data.amount} DA - ${data.notes || "Avance reçue"}`
                    ].filter(Boolean).join("\n")
                }
            })

            // Increment treasury account balance
            const updatedAccount = await tx.treasuryAccount.update({
                where: { id: data.accountId },
                data: {
                    balance: { increment: data.amount }
                }
            })

            // Create Treasury transaction
            await tx.treasuryTransaction.create({
                data: {
                    accountId: data.accountId,
                    type: "CREDIT",
                    amount: data.amount,
                    balanceBefore: account.balance,
                    balanceAfter: updatedAccount.balance,
                    source: "MANUAL_IN",
                    referenceId: data.supplierId,
                    description: `Emprunt Fournisseur: ${supplier?.name || "Inconnu"}${data.notes ? ` - ${data.notes}` : ""}`,
                    tenantId
                }
            })

            return { success: "Emprunt fournisseur enregistré avec succès" }
        })

        revalidatePath("/(dashboard)/suppliers")
        revalidatePath("/(dashboard)/emprunt-fournisseur")
        return { success: "Emprunt fournisseur enregistré avec succès" }
    } catch (error) {
        console.error("registerSupplierLoan error:", error)
        return { error: "Failed to register supplier loan" }
    }
}

export const getSupplierLoans = async (supplierId?: string) => {
    const session = await auth()
    if (!session?.user?.id) return []
    const tenantId = session.user.tenantId
    if (!tenantId) return []

    try {
        // Fetch specific or all suppliers 
        const supplierWhere: any = { tenantId }
        if (supplierId && supplierId !== "ALL") {
            supplierWhere.id = supplierId
        }

        const suppliers = await db.supplier.findMany({
            where: supplierWhere,
            select: { id: true, name: true }
        })

        const supplierIds = suppliers.map(s => s.id)

        // Supplier loans are MANUAL_IN transactions linked to a supplier
        const transactions = await db.treasuryTransaction.findMany({
            where: {
                tenantId,
                source: "MANUAL_IN",
                referenceId: { in: supplierIds }
            },
            orderBy: { date: "desc" }
        })

        const loans = transactions.map(t => {
            const supplier = suppliers.find(s => s.id === t.referenceId)
            return {
                id: t.id,
                date: t.date.toISOString(),
                amount: Number(t.amount),
                source: t.source,
                description: t.description || "",
                supplierName: supplier?.name || "Inconnu",
                supplierId: t.referenceId as string
            }
        })

        return loans
    } catch (error) {
        console.error("[GET_SUPPLIER_LOANS] error:", error)
        return []
    }
}

