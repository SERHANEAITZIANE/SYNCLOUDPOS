const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    console.log("Cleaning orphan RETURN movements...");
    const returnMovements = await db.stockMovement.findMany({
        where: { type: "RETURN", referenceId: { not: null } }
    });
    
    let deletedReturns = 0;
    for (const mov of returnMovements) {
        const item = await db.returnItem.findFirst({
            where: { returnId: mov.referenceId, productId: mov.productId }
        });
        
        let valid = false;
        if (item) {
            const ret = await db.productReturn.findUnique({ where: { id: mov.referenceId } });
            if (ret && ret.status === "COMPLETED") {
                valid = true;
            }
        }
        
        if (!valid) {
            await db.stockMovement.delete({ where: { id: mov.id } });
            deletedReturns++;
        }
    }
    console.log(`Deleted ${deletedReturns} orphan RETURN movements.`);
}
main().finally(() => db.$disconnect());
