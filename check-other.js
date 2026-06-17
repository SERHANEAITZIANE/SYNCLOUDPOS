const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    const spoilages = await db.stockMovement.count({ where: { type: "SPOILAGE" } });
    const transferIn = await db.stockMovement.count({ where: { type: "TRANSFER_IN" } });
    const transferOut = await db.stockMovement.count({ where: { type: "TRANSFER_OUT" } });
    
    console.log(`Spoilages: ${spoilages}`);
    console.log(`Transfer In: ${transferIn}`);
    console.log(`Transfer Out: ${transferOut}`);
}

main().finally(() => db.$disconnect());
