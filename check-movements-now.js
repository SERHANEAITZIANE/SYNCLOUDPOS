const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    const p = await db.product.findFirst({ where: { name: { contains: "NANO KIDS" } } });
    if (!p) { console.log("Product not found"); return; }
    
    console.log("PRODUCT ID:", p.id);
    console.log("REAL STOCK:", p.stock);
    
    const movs = await db.stockMovement.findMany({
        where: { productId: p.id },
        orderBy: { createdAt: "asc" }
    });
    
    let totalIn = 0;
    let totalOut = 0;
    console.log("\n--- STOCK MOVEMENTS ---");
    for (const m of movs) {
        console.log(`[${m.createdAt.toISOString()}] ${m.type} | QTY: ${m.quantity} | REF: ${m.referenceId} | REASON: ${m.reason}`);
        if (m.quantity > 0) totalIn += m.quantity;
        if (m.quantity < 0) totalOut += Math.abs(m.quantity);
    }
    console.log(`\nTOTAL ENTRÉES: ${totalIn}`);
    console.log(`TOTAL SORTIES: ${totalOut}`);
}
main().finally(() => db.$disconnect());
