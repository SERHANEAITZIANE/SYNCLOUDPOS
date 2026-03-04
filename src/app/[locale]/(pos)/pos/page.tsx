import { getCategories } from "@/actions/categories"
import { getTreasuryAccounts } from "@/actions/treasury"
import { PosClient } from "@/components/pos/pos-client"
import { db } from "@/lib/db"
import { getActiveTenantId } from "@/actions/get-active-tenant"
import { auth } from "@/auth"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"

const PosPage = async () => {
    const t = await getTranslations("PosPage")
    const session = await auth()
    if (!session?.user?.id) return <div>{t("unauthorized")}</div>

    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "MANAGER" && session?.user?.role !== "CASHIER" && !session?.user?.isSuperadmin) {
        redirect("/dashboard")
    }

    const tenantId = await getActiveTenantId()
    if (!tenantId) return <div>{t("noTenant")}</div>

    const defaultStoreId = session?.user?.defaultStoreId;
    const storeIdToUse = defaultStoreId || (await db.store.findFirst({ where: { tenantId } }))?.id;

    if (!storeIdToUse) {
        return <div>No Store Available</div> // Consider adding to translation if needed
    }

    let storeName = "Premium POS"
    let storeAddress = ""
    let storePhone = ""
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
    const store = await db.store.findUnique({ where: { id: storeIdToUse } })

    if (store?.name) storeName = store.name
    else if (tenant?.name) storeName = tenant.name

    if (store?.address) storeAddress = store.address
    else if (tenant?.address) storeAddress = tenant.address

    if (tenant?.phone) storePhone = tenant.phone

    const categories = await getCategories()
    const accounts = await getTreasuryAccounts()

    // 1. Fetch Lightweight Customers Array
    const rawCustomers = await db.customer.findMany({
        where: { tenantId },
        select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            balance: true,
            clientType: true,
            createdAt: true
        }
    })

    const formattedCustomers = rawCustomers.map(c => ({
        ...c,
        balance: c.balance ? Number(c.balance) : 0,
        createdAt: c.createdAt.toISOString()
    }))

    // 2. Fetch Lightweight Products Array
    const rawProducts = await db.product.findMany({
        where: { tenantId },
        select: {
            id: true,
            name: true,
            description: true,
            price: true,
            cost: true,
            categoryId: true,
            category: { select: { name: true } },
            wholesalePrice: true,
            dealerPrice: true,
            tvaRate: true,
            storeProducts: {
                where: { storeId: storeIdToUse }
            },
            isFeatured: true,
            barcodes: { select: { value: true } },
            images: { select: { url: true }, take: 1 }
        }
    })

    const formattedProducts = rawProducts.map((item: any) => {
        const stock = item.storeProducts?.[0]?.stock || 0;
        const minStock = item.storeProducts?.[0]?.minStock || 0;
        return {
            id: item.id,
            name: item.name,
            description: item.description || "",
            price: Number(item.price),
            cost: Number(item.cost || 0),
            stock,
            minStock,
            category: item.category?.name || t("uncategorized"),
            categoryId: item.categoryId || "",
            wholesalePrice: Number(item.wholesalePrice || item.price),
            dealerPrice: Number(item.dealerPrice || item.price),
            tvaRate: Number(item.tvaRate ?? 19),
            imageUrl: item.images?.[0]?.url || "",
            isFeatured: item.isFeatured || false,
            barcodes: item.barcodes?.map((b: any) => b.value) || []
        }
    })

    return (
        <div className="absolute inset-0 animate-in fade-in zoom-in-95 duration-500">
            <PosClient storeName={storeName} storeAddress={storeAddress} storePhone={storePhone} products={formattedProducts} categories={categories} customers={formattedCustomers as any} accounts={accounts} />
        </div>
    )
}

export default PosPage
