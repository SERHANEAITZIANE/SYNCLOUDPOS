const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    const product = await db.product.findFirst({
        where: { name: { contains: "SMART WATCH NANO KIDS", mode: "insensitive" } }
    });

    if (!product) {
        console.log("Product not found");
        return;
    }

    const movements = await db.stockMovement.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: "asc" }
    });

    console.log("Movements for SMART WATCH NANO KIDS:");
    movements.forEach(m => {
        console.log(`- Type: ${m.type}, Qty: ${m.quantity}, Ref: ${m.referenceId}, Reason: ${m.reason}, Date: ${m.createdAt}`);
    });
}

main().finally(() => db.$disconnect());
