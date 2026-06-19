const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    const po = await db.purchaseOrder.findUnique({
        where: { id: "280d6e41-5b56-4f7f-ba26-37e31d924dde" },
        include: { items: true }
    });
    console.log("PurchaseOrder:", po);
}

main().finally(() => db.$disconnect());
