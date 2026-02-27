const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({ select: { email: true, role: true, tenantId: true } });
    const tenantUsers = await prisma.tenantUser.findMany();
    console.log(JSON.stringify({ users, tenantUsers }, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
