const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    const clients = await db.customer.findMany({
        where: { name: { contains: "TEST", mode: "insensitive" } },
        select: { id: true, name: true, balance: true, initialBalance: true }
    });

    console.log("Local TEST clients:");
    console.log(JSON.stringify(clients, null, 2));
}

main().finally(() => db.$disconnect());
