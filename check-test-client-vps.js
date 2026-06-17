const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    const client = await db.customer.findFirst({
        where: { name: { contains: "TEST CLIENT", mode: "insensitive" } },
        include: {
            salesOrders: true,
            productReturns: true
        }
    });

    if (!client) {
        console.log("Client not found");
        return;
    }

    console.log("Found client:", client.name);
    console.log("Balance:", client.balance);
    console.log("Initial Balance:", client.initialBalance);
    console.log("Sales Orders Count:", client.salesOrders.length);
    console.log("Returns Count:", client.productReturns.length);

    const payments = await db.treasuryTransaction.count({
        where: { customerId: client.id }
    });
    console.log("Treasury Payments Count:", payments);
}

main().finally(() => db.$disconnect());
