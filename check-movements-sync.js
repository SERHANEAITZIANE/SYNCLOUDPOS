const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    // Find the product
    const p = await db.product.findFirst({ where: { name: { contains: "NANO KIDS" } } });
    if (!p) { console.log("Product not found"); return; }
    
    console.log("PRODUCT ID:", p.id);
    console.log("REAL STOCK:", p.stock);
    
    const movs = await db.stockMovement.findMany({
        where: { productId: p.id },
        orderBy: { createdAt: "asc" }
    });
    
    console.log("\n--- STOCK MOVEMENTS ---");
    for (const m of movs) {
        console.log(`[${m.createdAt.toISOString()}] ${m.type} | QTY: ${m.quantity} | REF: ${m.referenceId} | REASON: ${m.reason}`);
    }
    
    console.log("\n--- PURCHASE ORDER ITEMS ---");
    const poItems = await db.purchaseOrderItem.findMany({
        where: { productId: p.id },
        include: { purchaseOrder: true }
    });
    for (const i of poItems) {
        console.log(`PO ID: ${i.purchaseOrderId} | STATUS: ${i.purchaseOrder.status} | QTY: ${i.quantity}`);
    }
    
}
main().finally(() => db.$disconnect());
