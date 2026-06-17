const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    const clientId = "6276183c-833a-466a-809c-284f3708417a";
    await db.customer.update({
        where: { id: clientId },
        data: { balance: 0, initialBalance: 0 }
    });
    console.log("TEST CLIENT balance has been forcefully reset to 0.");
}

main().finally(() => db.$disconnect());
