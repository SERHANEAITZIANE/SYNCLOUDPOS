import { getProducts } from "@/actions/products"
import { getCategories } from "@/actions/categories"
import { getCustomers } from "@/actions/customers"
import { getTreasuryAccounts } from "@/actions/treasury"
import { PosClient } from "@/components/pos/pos-client"
import { db } from "@/lib/db"
import { getActiveTenantId } from "@/actions/get-active-tenant"

const PosPage = async () => {
    const products = await getProducts()
    const categories = await getCategories()
    const customersRes = await getCustomers()
    const customers = customersRes && 'customers' in customersRes ? customersRes.customers : []
    const accounts = await getTreasuryAccounts()

    const tenantId = await getActiveTenantId()
    let storeName = "Premium POS"
    if (tenantId) {
        const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
        if (tenant?.name) storeName = tenant.name
    }

    // Ensure Decimals are serialized to Numbers so Client Components don't crash
    const formattedCustomers = (customers || []).map((c: any) => ({
        ...c,
        balance: c.balance ? Number(c.balance) : 0
    }))

    // Transform products to include image url string for the grid
    const formattedProducts = (products as any[]).map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || "",
        price: Number(item.price),
        cost: Number(item.cost || 0),
        stock: item.stock,
        minStock: Number(item.minStock || 0),
        category: item.category?.name || "Uncategorized",
        categoryId: item.categoryId || "",
        wholesalePrice: Number(item.wholesalePrice || item.price),
        dealerPrice: Number(item.dealerPrice || item.price),
        imageUrl: item.images?.[0]?.url || "",
        barcodes: (item as any).barcodes?.map((b: any) => b.value) || []
    }))

    return (
        <div className="absolute inset-0 animate-in fade-in zoom-in-95 duration-500">
            <PosClient storeName={storeName} products={formattedProducts} categories={categories} customers={formattedCustomers} accounts={accounts} />
        </div>
    )
}

export default PosPage
