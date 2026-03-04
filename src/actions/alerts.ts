"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export type AlertType =
    | "STOCK_RUPTURE"     // Product completely out of stock
    | "LOW_STOCK"         // Product below minimum stock level
    | "UNPAID_CUSTOMER"   // Customer with outstanding debt
    | "UNPAID_SUPPLIER"   // Supplier we owe money to
    | "PENDING_PURCHASE"  // Purchase order still pending

export type Alert = {
    id: string
    type: AlertType
    severity: "critical" | "warning" | "info"
    title: string
    description: string
    href: string
    value?: number
}

export async function getAlerts(): Promise<Alert[]> {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return []

    try {
        // Fetch all alert sources in parallel
        const [
            outOfStockProducts,
            lowStockProducts,
            unpaidCustomers,
            unpaidSuppliers,
            pendingPurchases,
        ] = await Promise.all([
            // 1. Products completely out of stock (and not archived)
            db.product.findMany({
                where: { tenantId, isArchived: false, storeProducts: { some: { stock: { lte: 0 } } } },
                include: { storeProducts: true },
                orderBy: { name: "asc" },
                take: 20,
            }),

            // 2. Products below their minimum stock level (but still > 0)
            db.$queryRaw<{ id: string; name: string; stock: number; minStock: number }[]>`
                SELECT p.id, p.name, SUM(sp.stock) as stock, SUM(sp."minStock") as "minStock"
                FROM "Product" p
                JOIN "StoreProduct" sp ON p.id = sp."productId"
                WHERE p."tenantId" = ${tenantId}
                  AND p."isArchived" = false
                GROUP BY p.id, p.name
                HAVING SUM(sp.stock) > 0 AND SUM(sp.stock) < SUM(sp."minStock")
                ORDER BY stock ASC
                LIMIT 20
            `,

            // 3. Customers with unpaid debt (positive balance = they owe us)
            db.customer.aggregate({
                where: { tenantId, balance: { gt: 0 } },
                _count: { _all: true },
                _sum: { balance: true },
            }),

            // 4. Suppliers we owe money to (positive balance = we owe them)
            db.supplier.aggregate({
                where: { tenantId, balance: { gt: 0 } },
                _count: { _all: true },
                _sum: { balance: true },
            }),

            // 5. Purchase orders that are still in PENDING or BON_COMMANDE status older than 2 days
            db.purchaseOrder.count({
                where: {
                    tenantId,
                    status: { in: ["PENDING", "BON_COMMANDE"] },
                    createdAt: { lte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
                }
            }),
        ])

        const alerts: Alert[] = []

        // ── Stock rupture alerts ──────────────────────────────────────────
        if (outOfStockProducts.length > 0) {
            if (outOfStockProducts.length <= 3) {
                // Show each product individually
                outOfStockProducts.forEach(p => {
                    alerts.push({
                        id: `rupture-${p.id}`,
                        type: "STOCK_RUPTURE",
                        severity: "critical",
                        title: "Rupture de stock",
                        description: `"${p.name}" est en rupture de stock`,
                        href: `/products`,
                    })
                })
            } else {
                alerts.push({
                    id: "rupture-group",
                    type: "STOCK_RUPTURE",
                    severity: "critical",
                    title: "Ruptures de stock",
                    description: `${outOfStockProducts.length} produits en rupture de stock`,
                    href: `/products`,
                    value: outOfStockProducts.length,
                })
            }
        }

        // ── Low stock alerts ──────────────────────────────────────────────
        if (lowStockProducts.length > 0) {
            alerts.push({
                id: "low-stock-group",
                type: "LOW_STOCK",
                severity: "warning",
                title: "Stock faible",
                description: `${lowStockProducts.length} produit(s) sous le stock minimum`,
                href: `/products/inventory`,
                value: lowStockProducts.length,
            })
        }

        // ── Unpaid customers alerts ───────────────────────────────────────
        const unpaidCustomerCount = unpaidCustomers._count._all
        const unpaidCustomerTotal = Number(unpaidCustomers._sum.balance || 0)
        if (unpaidCustomerCount > 0) {
            alerts.push({
                id: "unpaid-customers",
                type: "UNPAID_CUSTOMER",
                severity: unpaidCustomerCount >= 10 ? "critical" : "warning",
                title: "Clients impayés",
                description: `${unpaidCustomerCount} client(s) avec ${unpaidCustomerTotal.toLocaleString("fr-DZ")} DA en attente`,
                href: `/customers/unpaid`,
                value: unpaidCustomerTotal,
            })
        }

        // ── Unpaid suppliers alerts ───────────────────────────────────────
        const unpaidSupplierCount = unpaidSuppliers._count._all
        const unpaidSupplierTotal = Number(unpaidSuppliers._sum.balance || 0)
        if (unpaidSupplierCount > 0) {
            alerts.push({
                id: "unpaid-suppliers",
                type: "UNPAID_SUPPLIER",
                severity: unpaidSupplierTotal >= 50000 ? "critical" : "warning",
                title: "Fournisseurs à payer",
                description: `${unpaidSupplierCount} fournisseur(s), total dû: ${unpaidSupplierTotal.toLocaleString("fr-DZ")} DA`,
                href: `/suppliers`,
                value: unpaidSupplierTotal,
            })
        }

        // ── Pending purchase orders ───────────────────────────────────────
        if (pendingPurchases > 0) {
            alerts.push({
                id: "pending-purchases",
                type: "PENDING_PURCHASE",
                severity: "info",
                title: "Commandes en attente",
                description: `${pendingPurchases} bon(s) de commande non traité(s) depuis +2 jours`,
                href: `/purchases`,
                value: pendingPurchases,
            })
        }

        return alerts
    } catch (error) {
        console.error("[GET_ALERTS]", error)
        return []
    }
}
