const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    console.log("Cleaning orphan PURCHASE movements...");
    const purchaseMovements = await db.stockMovement.findMany({
        where: { type: "PURCHASE", referenceId: { not: null } }
    });
    
    let deletedPurchases = 0;
    for (const mov of purchaseMovements) {
        const item = await db.purchaseOrderItem.findFirst({
            where: { purchaseOrderId: mov.referenceId, productId: mov.productId }
        });
        
        // Also check if the PO itself is still a stock status
        let isValidStatus = true;
        if (item) {
            const po = await db.purchaseOrder.findUnique({ where: { id: mov.referenceId } });
            if (po && !["BON_LIVRAISON", "FACTURE", "COMPLETED"].includes(po.status)) {
                isValidStatus = false;
            }
        }
        
        if (!item || !isValidStatus) {
            await db.stockMovement.delete({ where: { id: mov.id } });
            deletedPurchases++;
        }
    }
    console.log(`Deleted ${deletedPurchases} orphan PURCHASE movements.`);
    
    console.log("Cleaning orphan SALE movements...");
    const saleMovements = await db.stockMovement.findMany({
        where: { type: "SALE", referenceId: { not: null } }
    });
    
    let deletedSales = 0;
    for (const mov of saleMovements) {
        // SALE can be from SalesOrder or POS Order
        let valid = false;
        
        // Check SalesOrder
        const soItem = await db.salesOrderItem.findFirst({
            where: { salesOrderId: mov.referenceId, productId: mov.productId }
        });
        if (soItem) {
            const so = await db.salesOrder.findUnique({ where: { id: mov.referenceId } });
            if (so && ["VALIDATED", "PAID", "PARTIAL"].includes(so.status)) {
                valid = true;
            }
        }
        
        // Check POS Order
        if (!valid) {
            const posItem = await db.orderItem.findFirst({
                where: { orderId: mov.referenceId, productId: mov.productId }
            });
            if (posItem) {
                const po = await db.order.findUnique({ where: { id: mov.referenceId } });
                if (po && po.status !== "CANCELLED") {
                    valid = true;
                }
            }
        }
        
        if (!valid) {
            await db.stockMovement.delete({ where: { id: mov.id } });
            deletedSales++;
        }
    }
    console.log(`Deleted ${deletedSales} orphan SALE movements.`);
    
    console.log("Done!");
}

main().finally(() => db.$disconnect());
