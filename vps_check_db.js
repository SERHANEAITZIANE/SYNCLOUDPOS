const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const userCount = await prisma.user.count();
    const customerCount = await prisma.customer.count();
    const tenantUserCount = await prisma.tenantUser.count();

    const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, tenantId: true } });
    const customers = await prisma.customer.findMany({ select: { id: true, name: true, tenantId: true } });

    console.log(JSON.stringify({
        counts: { userCount, customerCount, tenantUserCount },
        users,
        customers
    }, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
