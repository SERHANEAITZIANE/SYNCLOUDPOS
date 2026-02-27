import { db } from "@/lib/db";
import { getActiveTenantId } from "@/actions/get-active-tenant";
import { PurchasesReportClient } from "./components/client";
import { redirect } from "next/navigation";

export default async function PurchasesReportPage() {
    const tenantId = await getActiveTenantId();

    if (!tenantId) {
        redirect("/login");
    }

    // Suppliers debt calculation
    const suppliers = await db.supplier.findMany({
        where: { tenantId }
    });
    const totalSupplierDebt = suppliers.reduce((acc, s) => acc + Number(s.balance), 0);

    // Purchase history
    const purchases = await db.purchaseOrder.findMany({
        where: { tenantId },
        include: { supplier: true },
        orderBy: { createdAt: "desc" }
    });

    const totalPurchasesValue = purchases.reduce((acc, p) => acc + Number(p.total), 0);

    const formattedPurchases = purchases.map((purchase) => ({
        id: purchase.id,
        date: purchase.createdAt.toISOString(),
        supplier: purchase.supplier.name,
        total: Number(purchase.total),
        status: purchase.status,
    }));

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <PurchasesReportClient
                    totalPurchasesValue={totalPurchasesValue}
                    totalSupplierDebt={totalSupplierDebt}
                    purchaseOrders={formattedPurchases}
                />
            </div>
        </div>
    );
}
