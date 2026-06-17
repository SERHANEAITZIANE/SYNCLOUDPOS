const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    console.log("Looking for TEST CLIENT...");
    const client = await db.customer.findFirst({
        where: { name: { contains: "TEST CLIENT", mode: "insensitive" } },
        include: {
            salesOrders: {
                select: { id: true, total: true, status: true, amountPaid: true, createdAt: true }
            },
            productReturns: {
                select: { id: true, total: true, status: true, createdAt: true }
            }
        }
    });

    if (!client) {
        console.log("Client not found in local DB. Might be on VPS.");
        return;
    }

    console.log("Client found:", client.name, "(ID: " + client.id + ")");
    console.log("Current balance field:", client.balance);
    console.log("Initial balance:", client.initialBalance);

    console.log("\nSales Orders:");
    client.salesOrders.forEach(o => console.log(`- SO ${o.id}: Total=${o.total}, Paid=${o.amountPaid}, Status=${o.status}`));

    const payments = await db.treasuryTransaction.findMany({
        where: { customerId: client.id }
    });
    console.log("\nTreasury Transactions (Payments):");
    payments.forEach(p => console.log(`- Payment ${p.id}: Amount=${p.amount}, Type=${p.type}, Source=${p.source}, Ref=${p.referenceId}`));

    console.log("\nReturns:");
    client.productReturns.forEach(r => console.log(`- Return ${r.id}: Total=${r.total}, Status=${r.status}`));
}

main().finally(() => db.$disconnect());
