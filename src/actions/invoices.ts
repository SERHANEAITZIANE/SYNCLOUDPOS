"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { checkSubscription } from "@/lib/subscription"

// ────────────────────────────────────────────────────────────────────────────
// Helper: generate invoice number (FA-2026/0001)
// ────────────────────────────────────────────────────────────────────────────
async function generateInvoiceNumber(tenantId: string) {
  const year = new Date().getFullYear()
  const counter = await db.sequenceCounter.upsert({
    where: { tenantId_prefix_year: { tenantId, prefix: "FA", year } },
    update: { lastValue: { increment: 1 } },
    create: { tenantId, prefix: "FA", year, lastValue: 1 },
  })
  return `FA-${year}/${counter.lastValue.toString().padStart(4, "0")}`
}

// ────────────────────────────────────────────────────────────────────────────
// CREATE invoice from BLs (group multiple BLs)
// salesOrderIds: list of BL ids to include in this invoice
// If a BL has items for a product already in another BL → quantities are summed
// ────────────────────────────────────────────────────────────────────────────
export async function createInvoiceFromBLs(data: {
  customerId: string
  salesOrderIds: string[] // BL ids to include
  storeId?: string
  dueDate?: Date
  notes?: string
  paymentMethod?: string
}) {
  await checkSubscription()
  try {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId

    if (!data.salesOrderIds.length) {
      return { error: "Sélectionnez au moins un BL" }
    }

    const customer = await db.customer.findFirst({ where: { id: data.customerId, tenantId } });
    if (!customer) return { error: "Client introuvable ou non autorisé" };

    // Load all BLs and verify they belong to the same tenant + customer
    const bls = await db.salesOrder.findMany({
      where: {
        id: { in: data.salesOrderIds },
        tenantId,
        customerId: data.customerId,
        status: { notIn: ["CANCELLED"] },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, tvaRate: true } },
          },
        },
      },
    })

    if (bls.length !== data.salesOrderIds.length) {
      return { error: "Certains BLs sont invalides ou appartiennent à un autre client" }
    }

    // Check no BL is already fully invoiced
    const alreadyInvoiced = await db.invoiceItem.findMany({
      where: {
        salesOrderId: { in: data.salesOrderIds },
      },
      select: { salesOrderId: true },
    })
    const invoicedBLIds = new Set(alreadyInvoiced.map((i) => i.salesOrderId))
    if (invoicedBLIds.size > 0) {
      return {
        error: `${invoicedBLIds.size} BL(s) sont déjà facturés. Retirez-les de la sélection.`,
      }
    }

    // Aggregate items: group by productId, sum quantities and totals per BL
    // InvoiceItem keeps a reference to the source BL
    const invoiceItemsToCreate: {
      salesOrderId: string
      productId: string
      quantity: number
      unitPrice: number
      tvaRate: number
      priceHt: number
    }[] = []

    let subtotal = 0
    let tvaAmount = 0

    for (const bl of bls) {
      for (const item of bl.items) {
        const ht = Number(item.priceHt) * item.quantity
        const tva = ht * (Number(item.tvaRate) / 100)
        subtotal += ht
        tvaAmount += tva
        invoiceItemsToCreate.push({
          salesOrderId: bl.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          tvaRate: Number(item.tvaRate),
          priceHt: Number(item.priceHt),
        })
      }
    }

    const total = subtotal + tvaAmount

    const result = await db.$transaction(async (tx) => {
      const invoiceNumber = await generateInvoiceNumber(tenantId)

      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          customerId: data.customerId,
          storeId: data.storeId,
          invoiceNumber,
          status: "DRAFT",
          subtotal,
          tvaAmount,
          stampTax: 0,
          total,
          amountPaid: 0,
          paymentStatus: "PENDING",
          paymentMethod: data.paymentMethod,
          dueDate: data.dueDate,
          notes: data.notes,
          items: {
            create: invoiceItemsToCreate,
          },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true } },
              salesOrder: { select: { id: true, receiptNumber: true } },
            },
          },
        },
      })

      return invoice
    })

    revalidatePath("/[locale]/(dashboard)/invoices", "page")
    return { success: true, data: result }
  } catch (e) {
    console.error(e)
    return { error: "Erreur lors de la création de la facture" }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET invoices list
// ────────────────────────────────────────────────────────────────────────────
export async function getInvoices(params?: {
  customerId?: string
  status?: string
  paymentStatus?: string
  page?: number
  limit?: number
}) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId
    const page = params?.page ?? 1
    const limit = params?.limit ?? 20
    const skip = (page - 1) * limit

    const where = {
      tenantId,
      ...(params?.customerId && { customerId: params.customerId }),
      ...(params?.status && { status: params.status }),
      ...(params?.paymentStatus && { paymentStatus: params.paymentStatus }),
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          items: {
            include: {
              product: { select: { id: true, name: true } },
              salesOrder: { select: { id: true, receiptNumber: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.invoice.count({ where }),
    ])

    return { success: true, data: invoices, total, page, limit }
  } catch (e) {
    console.error(e)
    return { error: "Erreur lors de la récupération des factures" }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET single invoice
// ────────────────────────────────────────────────────────────────────────────
export async function getInvoiceById(id: string) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId

    const invoice = await db.invoice.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        store: true,
        items: {
          include: {
            product: { select: { id: true, name: true, tvaRate: true } },
            salesOrder: { select: { id: true, receiptNumber: true, createdAt: true } },
          },
        },
      },
    })

    if (!invoice) return { error: "Facture introuvable" }
    return { success: true, data: invoice }
  } catch (e) {
    console.error(e)
    return { error: "Erreur lors de la récupération de la facture" }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// RECORD payment on invoice
// ────────────────────────────────────────────────────────────────────────────
export async function recordInvoicePayment(data: {
  invoiceId: string
  amount: number
  paymentMethod: string
  accountId?: string
}) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId

    const invoice = await db.invoice.findFirst({
      where: { id: data.invoiceId, tenantId },
    })
    if (!invoice) return { error: "Facture introuvable" }
    if (invoice.status === "CANCELLED") return { error: "Facture annulée" }

    const newAmountPaid = Number(invoice.amountPaid) + data.amount
    const total = Number(invoice.total)
    const paymentStatus =
      newAmountPaid >= total ? "PAID" : newAmountPaid > 0 ? "PARTIAL" : "PENDING"

    await db.$transaction(async (tx) => {
      // Update invoice
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newAmountPaid,
          paymentStatus,
          paymentMethod: data.paymentMethod,
          status: paymentStatus === "PAID" ? "PAID" : invoice.status,
        },
      })

      // Update customer balance (reduce debt)
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: { balance: { decrement: data.amount } },
      })

      // Create treasury transaction if account provided
      if (data.accountId) {
        const account = await tx.treasuryAccount.findFirst({
          where: { id: data.accountId, tenantId },
        })
        if (account) {
          const balanceBefore = Number(account.balance)
          const balanceAfter = balanceBefore + data.amount
          await tx.treasuryTransaction.create({
            data: {
              accountId: data.accountId,
              tenantId,
              type: "CREDIT",
              amount: data.amount,
              balanceBefore,
              balanceAfter,
              source: "SALE",
              referenceId: invoice.id,
              description: `Paiement facture ${invoice.invoiceNumber}`,
            },
          })
          await tx.treasuryAccount.update({
            where: { id: data.accountId },
            data: { balance: balanceAfter },
          })
        }
      }
    })

    revalidatePath("/[locale]/(dashboard)/invoices", "page")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { error: "Erreur lors de l'enregistrement du paiement" }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// UPDATE invoice status
// ────────────────────────────────────────────────────────────────────────────
export async function updateInvoiceStatus(id: string, status: string) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId

    await db.invoice.findFirst({ where: { id, tenantId } })
    const updated = await db.invoice.update({
      where: { id },
      data: { status },
    })

    revalidatePath("/[locale]/(dashboard)/invoices", "page")
    return { success: true, data: updated }
  } catch (e) {
    console.error(e)
    return { error: "Erreur lors de la mise à jour" }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET uninvoiced BLs for a customer (for invoice creation)
// ────────────────────────────────────────────────────────────────────────────
export async function getUninvoicedBLs(customerId: string) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId

    // BLs that have at least one item NOT yet in an InvoiceItem
    const allBLs = await db.salesOrder.findMany({
      where: {
        tenantId,
        customerId,
        type: "ORDER",
        status: { notIn: ["CANCELLED", "DRAFT"] },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Filter out BLs already fully invoiced
    const invoicedBLIds = await db.invoiceItem.findMany({
      where: {
        salesOrderId: { in: allBLs.map((bl) => bl.id) },
      },
      select: { salesOrderId: true },
    })
    const invoicedSet = new Set(invoicedBLIds.map((i) => i.salesOrderId))
    const uninvoiced = allBLs.filter((bl) => !invoicedSet.has(bl.id))

    return { success: true, data: uninvoiced }
  } catch (e) {
    console.error(e)
    return { error: "Erreur lors de la récupération des BLs" }
  }
}
