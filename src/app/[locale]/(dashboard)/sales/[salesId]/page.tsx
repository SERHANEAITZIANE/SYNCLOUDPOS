
import { getSalesOrder } from "@/actions/sales-orders"
import { getCustomers } from "@/actions/customers"
import { getProducts } from "@/actions/products"
import { SalesOrderForm } from "@/components/sales/sales-form"
import { getActiveTenantId } from "@/actions/get-active-tenant"
import { db } from "@/lib/db"

const SalesOrderPage = async ({
    params
}: {
    params: Promise<{ salesId: string }>
}) => {
    const { salesId } = await params

    const tenantId = await getActiveTenantId();
    const store = tenantId ? await db.tenant.findUnique({ where: { id: tenantId } }) : null;

    // Only fetch sales order if it's not "new"
    let salesOrder = (salesId === "new") ? null : await getSalesOrder(salesId)

    // Fallback: If it's a POS Order ID, find the corresponding SalesOrder via TreasuryTransaction
    if (!salesOrder && salesId !== "new" && tenantId) {
        const tx = await db.treasuryTransaction.findFirst({
            where: { referenceId: salesId, source: "SALE", tenantId }
        })
        if (tx && tx.description) {
            // Description format: "Paiement Vente N° BL-2026/XXXX"
            const match = tx.description.match(/N°\s*(.+)$/i)
            if (match) {
                const receiptNumber = match[1].trim()
                const foundByReceipt = await db.salesOrder.findFirst({
                    where: { receiptNumber, tenantId },
                    include: {
                        customer: true,
                        items: { include: { product: { include: { barcodes: true } } } }
                    }
                })
                if (foundByReceipt) {
                    salesOrder = JSON.parse(JSON.stringify(foundByReceipt))
                }
            }
        }
        
        // If still not found, try finding SalesOrder with exact same total and customer created around the same time
        if (!salesOrder) {
            const posOrder = await db.order.findUnique({ where: { id: salesId, tenantId } })
            if (posOrder) {
                const timeMin = new Date(posOrder.createdAt.getTime() - 60000)
                const timeMax = new Date(posOrder.createdAt.getTime() + 60000)
                const fallbackSo = await db.salesOrder.findFirst({
                    where: {
                        tenantId,
                        total: posOrder.total,
                        customerId: posOrder.customerId,
                        createdAt: { gte: timeMin, lte: timeMax }
                    },
                    include: {
                        customer: true,
                        items: { include: { product: { include: { barcodes: true } } } }
                    }
                })
                if (fallbackSo) {
                    salesOrder = JSON.parse(JSON.stringify(fallbackSo))
                }
            }
        }
    }

    // Helper to ensure data is safe for client components
    const plainify = (obj: any): any => {
        return JSON.parse(JSON.stringify(obj))
    }

    const customersData = await getCustomers(1, 10000)
    const rawCustomers = ('customers' in customersData ? customersData.customers : []) || []

    // Explicitly safe mapping for customers
    const customers = rawCustomers.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || "",
        email: c.email || "",
        address: c.address || "",
        city: c.city || "",
        taxId: c.taxId || "",
        notes: c.notes || "",
        balance: c.balance ? Number(c.balance) : 0,
        loyaltyPoints: c.loyaltyPoints ?? 0,
        tenantId: c.tenantId,
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : null,
        updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : null,
    }))

    const productsData = await getProducts(1, 10000)
    const rawProducts = ('items' in productsData ? productsData.items : productsData) || []
    // Explicitly safe mapping for products
    const products = rawProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        price: p.price ? Number(p.price) : 0,
        cost: p.cost ? Number(p.cost) : 0,
        stock: p.stock ? Number(p.stock) : 0,
        minStock: p.minStock ? Number(p.minStock) : 0,
        wholesalePrice: p.wholesalePrice ? Number(p.wholesalePrice) : 0,
        dealerPrice: p.dealerPrice ? Number(p.dealerPrice) : 0,
        categoryId: p.categoryId,
        supplierId: p.supplierId,
        barcodes: p.barcodes || [],
        tvaRate: p.tvaRate ? Number(p.tvaRate) : 0,
    }))

    const formattedSalesOrder = salesOrder ? plainify({
        ...salesOrder,
        total: Number(salesOrder.total),
        receiptNumber: salesOrder.receiptNumber || "",
        items: salesOrder.items.map((item: any) => ({
            ...item,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            product: {
                ...item.product,
                price: Number(item.product.price) || 0,
                cost: Number(item.product.cost) || 0,
                stock: Number(item.product.stock) || 0,
            }
        }))
    }) : null

    console.log("Sanitized Customers Sample:", customers[0]) // Debug log

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SalesOrderForm
                    initialData={formattedSalesOrder}
                    customers={customers}
                    products={products}
                    storeData={store ? plainify(store) : null}
                />
            </div>
        </div>
    )
}

export default SalesOrderPage
