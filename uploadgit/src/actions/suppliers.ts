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
}

export const getSuppliers = async () => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    // @ts-expect-error tenantId not typed in session yet
    const tenantId = session.user.tenantId

    if (!tenantId) return { error: "Tenant ID missing from session" }

    try {
        const suppliers = await db.supplier.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" }
        })
        return { suppliers }
    } catch (_error) {
        return { error: "Failed to fetch suppliers" }
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
