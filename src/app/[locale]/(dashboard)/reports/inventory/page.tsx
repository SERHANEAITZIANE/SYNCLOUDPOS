import { db } from "@/lib/db";
import { getActiveTenantId } from "@/actions/get-active-tenant";
import { InventoryReportClient } from "./components/client";
import { redirect } from "next/navigation";

export default async function InventoryReportPage() {
    const tenantId = await getActiveTenantId();

    if (!tenantId) {
        redirect("/login");
    }

    const products = await db.product.findMany({
        where: {
            tenantId,
            isArchived: false
        },
        orderBy: {
            name: "asc"
        },
        include: { storeProducts: true }
    });

    const formattedData = products.map((product) => {
        const stock = product.storeProducts.reduce((sum, sp) => sum + sp.stock, 0);
        const minStock = product.storeProducts.reduce((sum, sp) => sum + sp.minStock, 0);
        return {
            id: product.id,
            name: product.name,
            stock,
            minStock,
            cost: Number(product.cost || product.price), // Fallback to price if cost is somehow missing
            price: Number(product.price),
        };
    }).sort((a, b) => a.stock - b.stock);

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <InventoryReportClient data={formattedData} />
            </div>
        </div>
    );
}
