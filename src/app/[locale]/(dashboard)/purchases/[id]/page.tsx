
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { PurchaseOrderForm } from "@/components/purchases/purchase-form"
import { getPurchaseOrder } from "@/actions/purchase-orders"
import { getTreasuryAccounts } from "@/actions/treasury"

export default async function PurchaseOrderPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params;
    let purchaseOrder = null
    let payments = []
    if (id !== "new") {
        const result = await getPurchaseOrder(id)
        if (result.purchaseOrder) {
            purchaseOrder = result.purchaseOrder
            payments = result.payments || []
        }
    }

    const session = await auth()
    const tenantId = session?.user?.tenantId

    const suppliers = await db.supplier.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' }
    })

    const products = await db.product.findMany({
        orderBy: { name: 'asc' },
        where: { isArchived: false, tenantId },
        include: { barcodes: true }
    })

    const categories = await db.category.findMany({ where: { tenantId } })
    const brands = await db.brand.findMany({ where: { tenantId } })

    const accounts = await getTreasuryAccounts()

    const defaultStoreId = session?.user?.defaultStoreId;
    const storeIdToUse = defaultStoreId || (await db.store.findFirst({ where: { tenantId } }))?.id;
    const store = storeIdToUse ? await db.store.findUnique({ where: { id: storeIdToUse } }) : null;

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <PurchaseOrderForm
                    initialData={purchaseOrder ? JSON.parse(JSON.stringify(purchaseOrder)) : null}
                    payments={payments}
                    suppliers={JSON.parse(JSON.stringify(suppliers))}
                    products={JSON.parse(JSON.stringify(products))}
                    accounts={accounts}
                    categories={JSON.parse(JSON.stringify(categories))}
                    brands={JSON.parse(JSON.stringify(brands))}
                    storeData={store ? JSON.parse(JSON.stringify(store)) : null}
                />
            </div>
        </div>
    )
}
