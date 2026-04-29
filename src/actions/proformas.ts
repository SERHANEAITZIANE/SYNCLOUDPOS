"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { checkSubscription } from "@/lib/subscription"

// ────────────────────────────────────────────────────────────────────────────
// Helper: generate proforma number (PF-2026/0001)
// ────────────────────────────────────────────────────────────────────────────
async function generateProformaNumber(tenantId: string) {
  const year = new Date().getFullYear()
  const counter = await db.sequenceCounter.upsert({
    where: { tenantId_prefix_year: { tenantId, prefix: "PF", year } },
    update: { lastValue: { increment: 1 } },
    create: { tenantId, prefix: "PF", year, lastValue: 1 },
  })
  return `PF-${year}/${counter.lastValue.toString().padStart(4, "0")}`
}

// ────────────────────────────────────────────────────────────────────────────
// CREATE proforma
// ────────────────────────────────────────────────────────────────────────────
export async function createProforma(data: {
  customerId: string
  storeId?: string
  validUntil?: Date
  notes?: string
  subtotal: number
  tvaAmount: number
  stampTax: number
  total: number
  items: {
    productId: string
    quantity: number
    unitPrice: number
    tvaRate: number
    priceHt: number
  }[]
}) {
  await checkSubscription()
  try {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId

    const proformaNumber = await generateProformaNumber(tenantId)

    const proforma = await db.proforma.create({
      data: {
        tenantId,
        customerId: data.customerId,
        storeId: data.storeId,
        proformaNumber,
        status: "DRAFT",
        subtotal: data.subtotal,
        tvaAmount: data.tvaAmount,
        stampTax: data.stampTax,
        total: data.total,
        validUntil: data.validUntil,
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            quantityDelivered: 0,
            unitPrice: item.unitPrice,
            tvaRate: item.tvaRate,
            priceHt: item.priceHt,
          })),
        },
      },
      include: { items: true },
    })

    revalidatePath("/[locale]/(dashboard)/proformas", "page")
    return { success: true, data: proforma }
  } catch (e) {
    console.error(e)
    return { error: "Erreur lors de la création du proforma" }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET proformas list
// ────────────────────────────────────────────────────────────────────────────
export async function getProformas(params?: {
  customerId?: string
  status?: string
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
    }

    const [proformas, total] = await Promise.all([
      db.proforma.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          items: {
            include: { product: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.proforma.count({ where }),
    ])

    return { success: true, data: proformas, total, page, limit }
  } catch (e) {
    console.error(e)
    return { error: "Erreur lors de la récupération des proformas" }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET single proforma with BL progress
// ────────────────────────────────────────────────────────────────────────────
export async function getProformaById(id: string) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId

    const proforma = await db.proforma.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        items: {
          include: { product: { select: { id: true, name: true, price: true, tvaRate: true } } },
        },
        salesOrders: {
          where: { status: { notIn: ["CANCELLED"] } },
          include: {
            items: {
              include: { product: { select: { id: true, name: true } } },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!proforma) return { error: "Proforma introuvable" }
    return { success: true, data: proforma }
  } catch (e) {
    console.error(e)
    return { error: "Erreur lors de la récupération du proforma" }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// UPDATE proforma status
// ────────────────────────────────────────────────────────────────────────────
export async function updateProformaStatus(id: string, status: string) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId

    const proforma = await db.proforma.findFirst({ where: { id, tenantId } })
    if (!proforma) return { error: "Proforma introuvable" }

    const updated = await db.proforma.update({
      where: { id },
      data: { status },
    })

    revalidatePath("/[locale]/(dashboard)/proformas", "page")
    return { success: true, data: updated }
  } catch (e) {
    console.error(e)
    return { error: "Erreur lors de la mise à jour du statut" }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// CREATE BL from proforma (livraison partielle ou totale)
// ────────────────────────────────────────────────────────────────────────────
export async function createBLFromProforma(data: {
  proformaId: string
  storeId?: string
  paymentMethod?: string
  notes?: string
  items: {
    productId: string
    proformaItemId: string
    quantity: number // quantity to deliver NOW (≤ remaining)
    unitPrice: number
    tvaRate: number
    priceHt: number
  }[]
}) {
  await checkSubscription()
  try {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId

    const proforma = await db.proforma.findFirst({
      where: { id: data.proformaId, tenantId },
      include: { items: true },
    })

    if (!proforma) return { error: "Proforma introuvable" }
    if (["COMPLETED", "REJECTED", "CANCELLED"].includes(proforma.status)) {
      return { error: "Ce proforma ne peut plus être modifié" }
    }

    // Validate quantities — cannot deliver more than remaining
    for (const deliveryItem of data.items) {
      const proformaItem = proforma.items.find((i) => i.id === deliveryItem.proformaItemId)
      if (!proformaItem) return { error: `Article proforma introuvable` }
      const remaining = proformaItem.quantity - proformaItem.quantityDelivered
      if (deliveryItem.quantity > remaining) {
        return {
          error: `Quantité trop élevée pour l'article. Restant: ${remaining}`,
        }
      }
    }

    // Compute BL totals from items
    const subtotal = data.items.reduce(
      (sum, i) => sum + i.priceHt * i.quantity,
      0
    )
    const tvaAmount = data.items.reduce(
      (sum, i) => sum + i.priceHt * i.quantity * (i.tvaRate / 100),
      0
    )
    const total = subtotal + tvaAmount

    const result = await db.$transaction(async (tx) => {
      // Generate BL number
      const year = new Date().getFullYear()
      const blCounter = await tx.sequenceCounter.upsert({
        where: { tenantId_prefix_year: { tenantId, prefix: "BL", year } },
        update: { lastValue: { increment: 1 } },
        create: { tenantId, prefix: "BL", year, lastValue: 1 },
      })
      const receiptNumber = `BL-${year}/${blCounter.lastValue.toString().padStart(4, "0")}`

      // Create BL (SalesOrder)
      const bl = await tx.salesOrder.create({
        data: {
          tenantId,
          customerId: proforma.customerId,
          storeId: data.storeId ?? proforma.storeId,
          type: "ORDER",
          status: "VALIDATED",
          receiptNumber,
          paymentMethod: data.paymentMethod ?? "TERM",
          paymentStatus: "PENDING",
          subtotal,
          tvaAmount,
          stampTax: 0,
          total,
          notes: data.notes,
          proformaId: proforma.id,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              tvaRate: item.tvaRate,
              priceHt: item.priceHt,
            })),
          },
        },
        include: { items: true },
      })

      // Update quantityDelivered on each proforma item
      for (const deliveryItem of data.items) {
        await tx.proformaItem.update({
          where: { id: deliveryItem.proformaItemId },
          data: {
            quantityDelivered: { increment: deliveryItem.quantity },
          },
        })
      }

      // Reload proforma items to check if fully delivered
      const updatedItems = await tx.proformaItem.findMany({
        where: { proformaId: proforma.id },
      })
      const allDelivered = updatedItems.every(
        (item) => item.quantityDelivered >= item.quantity
      )
      const anyDelivered = updatedItems.some((item) => item.quantityDelivered > 0)

      const newStatus = allDelivered
        ? "COMPLETED"
        : anyDelivered
          ? "PARTIALLY_DELIVERED"
          : "ACCEPTED"

      await tx.proforma.update({
        where: { id: proforma.id },
        data: { status: newStatus },
      })

      // Update customer balance (credit: customer owes us)
      await tx.customer.update({
        where: { id: proforma.customerId },
        data: { balance: { increment: total } },
      })

      return bl
    })

    revalidatePath("/[locale]/(dashboard)/proformas", "page")
    revalidatePath("/[locale]/(dashboard)/sales-orders", "page")
    return { success: true, data: result }
  } catch (e) {
    console.error(e)
    return { error: "Erreur lors de la création du BL" }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE proforma (DRAFT only)
// ────────────────────────────────────────────────────────────────────────────
export async function deleteProforma(id: string) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId

    const proforma = await db.proforma.findFirst({ where: { id, tenantId } })
    if (!proforma) return { error: "Proforma introuvable" }
    if (proforma.status !== "DRAFT") {
      return { error: "Seuls les proformas en brouillon peuvent être supprimés" }
    }

    await db.proforma.delete({ where: { id } })
    revalidatePath("/[locale]/(dashboard)/proformas", "page")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { error: "Erreur lors de la suppression" }
  }
}
