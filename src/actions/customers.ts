"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auth } from "@/auth"

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
    clientType?: string
}

export const getCustomers = async (page: number = 1, pageSize: number = 20, search?: string) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized", customers: [], totalCount: 0 }

    // @ts-expect-error tenantId not typed in session yet
    const tenantId = session.user.tenantId

    if (!tenantId) return { error: "Tenant ID missing from session", customers: [], totalCount: 0 }

    try {
        const whereClause: any = { tenantId }

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

    // @ts-expect-error tenantId not typed in session yet
    const tenantId = session.user.tenantId

    try {
        const customer = await db.customer.create({
            data: {
                ...data,
                tenantId
            }
        })
        revalidatePath("/(dashboard)/customers")
        return { success: "Customer created", id: customer.id }
    } catch (error) {
        console.error("createCustomer error:", error)
        return { error: `Failed to create customer: ${error instanceof Error ? error.message : String(error)}` }
    }
}

export const updateCustomer = async (id: string, data: CustomerData) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        const customer = await db.customer.update({
            where: { id },
            data
        })
        revalidatePath("/(dashboard)/customers")
        return { success: "Customer updated", id: customer.id }
    } catch (_error) {
        return { error: "Failed to update customer" }
    }
}

export const deleteCustomer = async (id: string) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        await db.customer.delete({
            where: { id }
        })
        revalidatePath("/(dashboard)/customers")
        return { success: "Customer deleted" }
    } catch (_error) {
        return { error: "Failed to delete customer" }
    }
}

export const importCustomers = async (rows: CustomerData[]) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    // @ts-expect-error tenantId not typed in session yet
    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing from session" }

    const validRows = rows.filter(r => r.name?.trim())
    const errors = rows.length - validRows.length

    // Build all create data objects in memory (no DB calls needed)
    const createData = validRows.map(row => ({
        name: row.name.trim(),
        phone: row.phone || undefined,
        email: row.email || undefined,
        address: row.address || undefined,
        city: row.city || undefined,
        nif: row.nif || undefined,
        nis: row.nis || undefined,
        artImposition: row.artImposition || undefined,
        rc: row.rc || undefined,
        rib: row.rib || undefined,
        clientType: row.clientType || "RETAIL",
        barcode: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
        tenantId
    }))

    let created = 0
    try {
        // Batch-insert in chunks of 50 for best performance
        const batchSize = 50
        for (let i = 0; i < createData.length; i += batchSize) {
            const batch = createData.slice(i, i + batchSize)
            const result = await db.customer.createMany({ data: batch, skipDuplicates: true })
            created += result.count
        }
    } catch (error) {
        console.error("importCustomers error:", error)
    }

    revalidatePath("/(dashboard)/customers")
    return { success: `${created} clients importés`, errors }
}

export const getUnpaidCustomers = async () => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    // @ts-expect-error tenantId
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
    // @ts-expect-error tenantId
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
                    source: "MANUAL_IN",
                    referenceId: data.customerId, // Link to customer
                    description: `Paiement Client: ${data.notes || "Règlement de dette"}`,
                    date: data.date ? new Date(data.date) : new Date(),
                }
            });
        });

        revalidatePath("/(dashboard)/customers")
        revalidatePath("/(dashboard)/treasury")
        return { success: "Payment registered successfully" }
    } catch (error) {
        console.error("registerCustomerPayment error:", error)
        return { error: "Failed to register payment" }
    }
}

export const registerCustomerLoan = async (data: { customerId: string; amount: number; accountId: string; notes?: string; date?: Date | string }) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    // @ts-expect-error tenantId
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
                    description: `Prêt accordé au client: ${customer?.name || "Inconnu"}`,
                    tenantId
                }
            })

            return { success: "Emprunt enregistré avec succès" }
        })

        revalidatePath("/(dashboard)/customers")
        revalidatePath("/(dashboard)/emprunt")
        return { success: "Loan registered successfully" }
    } catch (error) {
        console.error("registerCustomerLoan error:", error)
        return { error: "Failed to register loan" }
    }
}

export const getCustomerLoans = async (customerId?: string) => {
    const session = await auth()
    if (!session?.user?.id) return []
    // @ts-expect-error tenantId
    const tenantId = session.user.tenantId
    if (!tenantId) return []

    // Loans are tracked via customer notes — parse loan entries from all customers
    try {
        const where: any = { tenantId }
        if (customerId && customerId !== "ALL") {
            where.id = customerId
        }

        const customers = await db.customer.findMany({
            where,
            select: { id: true, name: true, notes: true }
        })

        const loans: { id: string; date: string; amount: number; description: string; customerName: string; customerId: string }[] = []

        customers.forEach(c => {
            if (!c.notes) return
            const lines = c.notes.split("\n")
            lines.forEach((line, idx) => {
                const match = line.match(/\[EMPRUNT (\d{2}\/\d{2}\/\d{4})\]\s+(\d+(?:\.\d+)?)\s+DA\s*-\s*(.*)/)
                if (match) {
                    const [, dateStr, amount, desc] = match
                    const [day, month, year] = dateStr.split("/")
                    loans.push({
                        id: `${c.id}-${idx}`,
                        date: new Date(`${year}-${month}-${day}`).toISOString(),
                        amount: parseFloat(amount),
                        description: desc.trim(),
                        customerName: c.name,
                        customerId: c.id
                    })
                }
            })
        })

        // Sort most recent first
        loans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        return loans
    } catch (error) {
        console.error("getCustomerLoans error:", error)
        return []
    }
}
