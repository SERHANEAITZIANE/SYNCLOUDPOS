import { db } from "@/lib/db";
import { getActiveTenant } from "@/actions/get-active-tenant";
import { InventoryReportClient } from "./components/client";
import { redirect } from "next/navigation";

export default async function InventoryReportPage() {
    const tenantId = await getActiveTenant();

    if (!tenantId) {
        redirect("/login");
    }

    const products = await db.product.findMany({
        where: {
            tenantId,
            isArchived: false
        },
        orderBy: {
            stock: "asc"
        }
    });

    const formattedData = products.map((product) => ({
        id: product.id,
        name: product.name,
        stock: product.stock,
        minStock: product.minStock,
        cost: Number(product.cost || product.price), // Fallback to price if cost is somehow missing
        price: Number(product.price),
    }));

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <InventoryReportClient data={formattedData} />
            </div>
        </div>
    );
}
