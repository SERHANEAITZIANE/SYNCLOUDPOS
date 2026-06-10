import { getStockMovements } from "@/actions/stock-movements"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { StockMovementsClient } from "./components/stock-movements-client"

export default async function StockMovementsPage({
    params
}: {
    params: Promise<{ productId: string }>
}) {
    const { productId } = await params
    const session = await auth()
    const tenantId = session?.user?.tenantId

    if (!tenantId) redirect("/dashboard")

    const [product, result] = await Promise.all([
        db.product.findFirst({
            where: { id: productId, tenantId },
            select: { id: true, name: true, stock: true, price: true, cost: true }
        }),
        getStockMovements(productId)
    ])

    if (!product) redirect("/products")

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <StockMovementsClient
                    productName={product.name}
                    productId={product.id}
                    currentStock={product.stock}
                    price={Number(product.price)}
                    cost={product.cost ? Number(product.cost) : 0}
                    movements={("movements" in result ? result.movements : []) as any[]}
                />
            </div>
        </div>
    )
}
