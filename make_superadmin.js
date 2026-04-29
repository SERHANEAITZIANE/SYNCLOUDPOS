const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Find current superadmins
    const superadmins = await prisma.user.findMany({
      where: { isSuperadmin: true },
      select: { id: true, name: true, email: true }
    });
    
    console.log("--- Current Superadmins ---");
    if (superadmins.length === 0) {
      console.log("None found in the local database.");
    } else {
      superadmins.forEach(s => console.log(`- ${s.name} (${s.email})`));
    }

    // 2. Make xm@live.fr a superadmin
    const user = await prisma.user.findUnique({ where: { email: 'xm@live.fr' } });
    if (user) {
      await prisma.user.update({
        where: { email: 'xm@live.fr' },
        data: { isSuperadmin: true }
      });
      console.log("\n✅ Success: xm@live.fr has been updated to superadmin.");
    } else {
      console.log("\n❌ Error: xm@live.fr not found in the local database.");
    }
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
