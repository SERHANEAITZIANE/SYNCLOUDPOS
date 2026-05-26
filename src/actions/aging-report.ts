import { db } from "@/lib/db"
import { auth } from "@/auth"

export async function getPaymentAgingReport() {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing" }

    try {
        const customers = await db.customer.findMany({
            where: { tenantId, balance: { gt: 0 } },
            include: {
                salesOrders: {
                    where: {
                        status: { not: "CANCELLED" },
                        type: { in: ["INVOICE", "BON_LIVRAISON"] }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        const agingData = customers.map(customer => {
            let remainingDebt = Number(customer.balance);
            
            let bucket0_30 = 0;
            let bucket30_60 = 0;
            let bucket60_90 = 0;
            let bucket90Plus = 0;

            const now = new Date();

            // Allocate remaining debt to newest invoices first
            for (const order of customer.salesOrders) {
                if (remainingDebt <= 0) break;
                
                const orderTotal = Number(order.total);
                // The amount of this order that is still unpaid (capped by remaining total debt)
                const unpaidAmount = Math.min(orderTotal, remainingDebt);
                
                const daysOld = Math.floor((now.getTime() - order.createdAt.getTime()) / (1000 * 3600 * 24));

                if (daysOld <= 30) {
                    bucket0_30 += unpaidAmount;
                } else if (daysOld <= 60) {
                    bucket30_60 += unpaidAmount;
                } else if (daysOld <= 90) {
                    bucket60_90 += unpaidAmount;
                } else {
                    bucket90Plus += unpaidAmount;
                }

                remainingDebt -= unpaidAmount;
            }

            // If there's still debt left (e.g. initial balance or loans not linked to a sales order),
            // put it in 90+ bucket since it's unallocated or older
            if (remainingDebt > 0) {
                bucket90Plus += remainingDebt;
            }

            return {
                id: customer.id,
                name: customer.name,
                totalDebt: Number(customer.balance),
                bucket0_30,
                bucket30_60,
                bucket60_90,
                bucket90Plus
            };
        });

        // Sort by total debt
        agingData.sort((a, b) => b.totalDebt - a.totalDebt);

        return { data: agingData };
    } catch (error) {
        console.error("getPaymentAgingReport error:", error);
        return { error: "Failed to fetch aging report" };
    }
}
