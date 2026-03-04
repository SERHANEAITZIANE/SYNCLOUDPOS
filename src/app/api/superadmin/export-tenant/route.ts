import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
    const session = await auth()

    // Only superadmin can download tenant data
    if (!session?.user?.isSuperadmin) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get("tenantId")

    if (!tenantId) {
        return new NextResponse("tenantId is required", { status: 400 })
    }

    try {
        const [
            tenant,
            products,
            categories,
            brands,
            customers,
            suppliers,
            orders,
            salesOrders,
            purchaseOrders,
            expenses,
            expenseCategories,
            treasuryAccounts,
            treasuryTransactions,
            stockMovements,
            promotions,
            spoilages,
            stores,
            reservations,
        ] = await Promise.all([
            db.tenant.findUnique({
                where: { id: tenantId },
                select: {
                    id: true, name: true, ownerName: true, activity: true,
                    address: true, wilaya: true, commune: true, phone: true,
                    email: true, nif: true, rc: true, nis: true,
                    subscriptionEndsAt: true, isBlocked: true, createdAt: true,
                }
            }),
            db.product.findMany({ where: { tenantId }, include: { images: true, barcodes: true } }),
            db.category.findMany({ where: { tenantId } }),
            db.brand.findMany({ where: { tenantId } }),
            db.customer.findMany({ where: { tenantId } }),
            db.supplier.findMany({ where: { tenantId } }),
            db.order.findMany({ where: { tenantId }, include: { items: true } }),
            db.salesOrder.findMany({ where: { tenantId }, include: { items: true } }),
            db.purchaseOrder.findMany({ where: { tenantId }, include: { items: true } }),
            db.expense.findMany({ where: { tenantId } }),
            db.expenseCategory.findMany({ where: { tenantId } }),
            db.treasuryAccount.findMany({ where: { tenantId } }),
            db.treasuryTransaction.findMany({ where: { tenantId } }),
            db.stockMovement.findMany({ where: { tenantId } }),
            db.promotion.findMany({ where: { tenantId } }),
            db.spoilage.findMany({ where: { tenantId } }),
            db.store.findMany({ where: { tenantId } }),
            db.reservation.findMany({ where: { tenantId } }),
        ])

        const exportData = {
            exportedAt: new Date().toISOString(),
            exportedBy: "SyncCloud Superadmin",
            tenant,
            data: {
                products,
                categories,
                brands,
                customers,
                suppliers,
                orders,
                salesOrders,
                purchaseOrders,
                expenses,
                expenseCategories,
                treasuryAccounts,
                treasuryTransactions,
                stockMovements,
                promotions,
                spoilages,
                stores,
                reservations,
            },
            stats: {
                products: products.length,
                customers: customers.length,
                suppliers: suppliers.length,
                orders: orders.length,
                salesOrders: salesOrders.length,
                purchaseOrders: purchaseOrders.length,
                expenses: expenses.length,
            }
        }

        const filename = `synccloud-backup-${tenant?.name?.replace(/[^a-z0-9]/gi, "-").toLowerCase() || tenantId}-${new Date().toISOString().split("T")[0]}.json`

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="${filename}"`,
            }
        })
    } catch (error) {
        console.error("[TENANT_EXPORT_ERROR]", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
