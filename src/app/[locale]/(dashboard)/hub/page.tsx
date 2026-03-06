import { getActiveTenantId } from "@/actions/get-active-tenant";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { HubClient } from "./components/hub-client";

export default async function HubPage() {
    const tenantId = await getActiveTenantId();

    if (!tenantId) {
        redirect("/login");
    }

    const [
        productsCount,
        salesCount,
        customersCount,
        suppliersCount,
        purchasesCount,
        expensesCount,
        categoriesCount,
        brandsCount,
    ] = await Promise.all([
        db.product.count({ where: { tenantId, isArchived: false } }),
        db.order.count({ where: { tenantId } }),
        db.customer.count({ where: { tenantId } }),
        db.supplier.count({ where: { tenantId } }),
        db.purchaseOrder.count({ where: { tenantId } }),
        db.expense.count({ where: { tenantId } }),
        db.category.count({ where: { tenantId } }),
        db.brand.count({ where: { tenantId } }),
    ]);

    return (
        <div className="min-h-screen">
            <HubClient
                metrics={{
                    productsCount,
                    salesCount,
                    customersCount,
                    suppliersCount,
                    purchasesCount,
                    expensesCount,
                    categoriesCount,
                    brandsCount,
                }}
            />
        </div>
    );
}
