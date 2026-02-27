
import { db } from "@/lib/db"
import { PurchaseOrderForm } from "@/components/purchases/purchase-form"
import { getPurchaseOrder } from "@/actions/purchase-orders"
import { getTreasuryAccounts } from "@/actions/treasury"

export default async function PurchaseOrderPage({
    params
}: {
    params: Promise<{ purchaseId: string }>
}) {
    const { purchaseId } = await params;
    let purchaseOrder = null

    if (purchaseId !== "new") {
        const result = await getPurchaseOrder(purchaseId)
        if (result.purchaseOrder) {
            purchaseOrder = result.purchaseOrder
        }
    }

    const suppliers = await db.supplier.findMany({
        orderBy: { createdAt: 'desc' }
    })

    const products = await db.product.findMany({
        orderBy: { name: 'asc' },
        where: { isArchived: false },
        include: { barcodes: true }
    })

    const categories = await db.category.findMany()
    const brands = await db.brand.findMany()

    const accounts = await getTreasuryAccounts()

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <PurchaseOrderForm
                    initialData={purchaseOrder ? JSON.parse(JSON.stringify(purchaseOrder)) : null}
                    suppliers={JSON.parse(JSON.stringify(suppliers))}
                    products={JSON.parse(JSON.stringify(products))}
                    accounts={accounts}
                    categories={JSON.parse(JSON.stringify(categories))}
                    brands={JSON.parse(JSON.stringify(brands))}
                />
            </div>
        </div>
    )
}
