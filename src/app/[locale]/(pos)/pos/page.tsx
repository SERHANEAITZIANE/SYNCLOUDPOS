import { getCategories } from "@/actions/categories"
import { getTreasuryAccounts } from "@/actions/treasury"
import { PosClient } from "@/components/pos/pos-client"
import { db } from "@/lib/db"
import { getActiveTenantId } from "@/actions/get-active-tenant"
import { auth } from "@/auth"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { withCache } from "@/lib/redis"

const PosPage = async () => {
    const [t, session] = await Promise.all([
        getTranslations("PosPage"),
        auth()
    ])
    if (!session?.user?.id) return <div>{t("unauthorized")}</div>

    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "MANAGER" && session?.user?.role !== "CASHIER" && !session?.user?.isSuperadmin) {
        redirect("/dashboard")
    }

    const tenantId = await getActiveTenantId()
    if (!tenantId) return <div>{t("noTenant")}</div>

    const defaultStoreId = session?.user?.defaultStoreId;
    const storeIdToUse = defaultStoreId || (await db.store.findFirst({ where: { tenantId } }))?.id;

    if (!storeIdToUse) {
        return <div>No Store Available</div>
    }

    // ── Run ALL independent queries in parallel ──────────────────────
    const [tenant, store, categories, accounts, rawCustomers, rawProducts] = await Promise.all([
        db.tenant.findUnique({ where: { id: tenantId } }),
        db.store.findUnique({ where: { id: storeIdToUse } }),
        getCategories(),
        getTreasuryAccounts(),
        // Lightweight Customers
        db.customer.findMany({
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
        }),
        // Lightweight Products (cached in Redis for 60s)
        withCache(`pos-products:${tenantId}:${storeIdToUse}`, () =>
            db.product.findMany({
                where: { tenantId },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    price: true,
                    cost: true,
                    stock: true,
                    minStock: true,
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
            }),
            60
        )
    ])

    // Derive store info
    const storeName = store?.name || tenant?.name || "Premium POS"
    const storeAddress = store?.address || tenant?.address || ""
    const storePhone = tenant?.phone || ""

    const formattedCustomers = rawCustomers.map(c => ({
        ...c,
        balance: c.balance ? Number(c.balance) : 0,
        createdAt: c.createdAt.toISOString()
    }))

    const formattedProducts = rawProducts.map((item: any) => {
        const storeStock = item.storeProducts?.[0]?.stock;
        const stock = storeStock !== undefined && storeStock !== null ? storeStock : (item.stock || 0);
        const storeMinStock = item.storeProducts?.[0]?.minStock;
        const minStock = storeMinStock !== undefined && storeMinStock !== null ? storeMinStock : (item.minStock || 0);
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
            <PosClient storeName={storeName} storeAddress={storeAddress} storePhone={storePhone} products={formattedProducts} categories={categories} customers={formattedCustomers as any} accounts={accounts} posTimbreEnabled={tenant?.posTimbreEnabled ?? false} />
        </div>
    )
}

export default PosPage
