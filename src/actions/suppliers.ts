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
}

export const getSuppliers = async (page: number = 1, pageSize: number = 20, search?: string) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized", suppliers: [], totalCount: 0 }

    // @ts-expect-error tenantId not typed in session yet
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

    // @ts-expect-error tenantId not typed in session yet
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

    try {
        const supplier = await db.supplier.update({
            where: { id },
            data
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

    try {
        await db.supplier.delete({
            where: { id }
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
    // @ts-expect-error tenantId not typed in session yet
    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing from session" }

    const validRows = rows.filter(r => r.name?.trim())
    const errors = rows.length - validRows.length

    const createData = validRows.map(row => ({
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
        tenantId
    }))

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
}) => {
    try {
        const session = await auth()
        if (!session?.user?.id) return { error: "Unauthorized" }

        // @ts-expect-error tenantId
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
    // @ts-expect-error tenantId
    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing" }

    try {
        const result = await db.$transaction(async (tx) => {
            const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } })

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
                    description: `Avance reçue du fournisseur: ${supplier?.name || "Inconnu"}`,
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
    // @ts-expect-error tenantId
    const tenantId = session.user.tenantId
    if (!tenantId) return []

    try {
        const where: any = { tenantId }
        if (supplierId && supplierId !== "ALL") {
            where.id = supplierId
        }

        const suppliers = await db.supplier.findMany({
            where,
            select: { id: true, name: true, notes: true }
        })

        const loans: { id: string; date: string; amount: number; description: string; supplierName: string; supplierId: string }[] = []

        suppliers.forEach(s => {
            if (!s.notes) return
            const lines = s.notes.split("\n")
            lines.forEach((line, idx) => {
                const match = line.match(/\[EMPRUNT (\d{2}\/\d{2}\/\d{4})\]\s+(\d+(?:\.\d+)?)\s+DA\s*-\s*(.*)/)
                if (match) {
                    const [, dateStr, amount, desc] = match
                    const [day, month, year] = dateStr.split("/")
                    loans.push({
                        id: `${s.id}-${idx}`,
                        date: new Date(`${year}-${month}-${day}`).toISOString(),
                        amount: parseFloat(amount),
                        description: desc.trim(),
                        supplierName: s.name,
                        supplierId: s.id
                    })
                }
            })
        })

        loans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        return loans
    } catch (error) {
        console.error("getSupplierLoans error:", error)
        return []
    }
}

