const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    await prisma.user.updateMany({
        where: { email: 'admin@admin.com' },
        data: { isSuperadmin: true }
    });
    console.log('Done fixing admin');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    });
