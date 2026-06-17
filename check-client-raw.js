const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    const client = await db.customer.findFirst({
        where: { name: { contains: "TEST CLIENT", mode: "insensitive" } },
        include: {
            salesOrders: {
                select: { id: true, total: true, status: true, amountPaid: true, createdAt: true }
            },
            productReturns: {
                select: { id: true, totalAmount: true, status: true, createdAt: true }
            }
        }
    });

    if (!client) {
        console.log("Client not found.");
        return;
    }

    console.log(JSON.stringify({
        id: client.id,
        name: client.name,
        balance: client.balance,
        initialBalance: client.initialBalance,
        salesOrders: client.salesOrders,
        returns: client.productReturns
    }, null, 2));

    // Let's also check if there are any invoices
    const invoices = await db.invoice.findMany({
        where: { customerId: client.id }
    });
    console.log("Invoices:", JSON.stringify(invoices, null, 2));
}

main().finally(() => db.$disconnect());
