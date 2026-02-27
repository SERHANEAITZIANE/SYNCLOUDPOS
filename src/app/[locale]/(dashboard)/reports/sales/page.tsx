import { db } from "@/lib/db";
import { getActiveTenantId } from "@/actions/get-active-tenant";
import { SalesReportClient } from "./components/client";
import { redirect } from "next/navigation";

export default async function SalesReportPage() {
    const tenantId = await getActiveTenantId();

    if (!tenantId) {
        redirect("/login");
    }

    const orders = await db.order.findMany({
        where: {
            tenantId,
        },
        include: {
            customer: true,
        },
        orderBy: {
            createdAt: "desc"
        }
    });

    const formattedData = orders.map((order) => {
        const total = Number(order.total);
        const paid = Number(order.paidAmount);
        return {
            id: order.id,
            date: order.createdAt.toISOString(),
            customer: order.customer?.name || "Client Passager",
            total: total,
            paid: paid,
            debt: total - paid,
        };
    });

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SalesReportClient data={formattedData} />
            </div>
        </div>
    );
}
