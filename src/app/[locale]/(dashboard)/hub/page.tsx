import { getActiveTenantId } from "@/actions/get-active-tenant";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { HubClient } from "./components/hub-client";

export default async function HubPage() {
    const tenantId = await getActiveTenantId();

    if (!tenantId) {
        redirect("/login");
    }

    // You could fetch top-level counts here if needed for the cards
    // e.g. recent sales, low stock count, etc.
    const [productsCount, salesCount] = await Promise.all([
        db.product.count({ where: { tenantId, isArchived: false } }),
        db.order.count({ where: { tenantId } })
    ]);

    return (
        <div className="p-8 max-w-7xl mx-auto dark:bg-[#0A0A0A] min-h-screen">
            <HubClient metrics={{ productsCount, salesCount }} />
        </div>
    );
}
