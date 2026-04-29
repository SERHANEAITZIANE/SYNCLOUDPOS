const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  try {
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await prisma.tenant.create({ data: { name: 'Test Shop DB', phone: '123' } });
    }
    
    let store = await prisma.store.findFirst({ where: { tenantId: tenant.id }});
    if (!store) {
      store = await prisma.store.create({ data: { name: 'Store', tenantId: tenant.id } });
    }
    
    const password = await bcrypt.hash('Babez@16', 10);
    
    const user = await prisma.user.upsert({
      where: { email: 'xm@live.fr' },
      update: { password },
      create: { 
        name: 'XM Admin', 
        email: 'xm@live.fr', 
        password, 
        tenantId: tenant.id, 
        role: 'ADMIN', 
        defaultStoreId: store.id 
      }
    });
    console.log('User created/updated:', user.email);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
