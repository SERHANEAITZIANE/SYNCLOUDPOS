const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    const clientId = "6276183c-833a-466a-809c-284f3708417a";
    const client = await db.customer.findUnique({
        where: { id: clientId },
        include: {
            salesOrders: {
                select: { id: true, total: true, status: true, amountPaid: true, createdAt: true }
            },
            productReturns: {
                select: { id: true, totalAmount: true, status: true, createdAt: true }
            }
        }
    });

    console.log(JSON.stringify(client, null, 2));
}

main().finally(() => db.$disconnect());
