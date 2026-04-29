const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function test() {
  try {
    const password = await bcrypt.hash('password123', 10);
    const tenant = await prisma.tenant.create({ data: { name: 'Test Shop DB', phone: '123' } });
    console.log('Tenant:', tenant.id);
    const store = await prisma.store.create({ data: { name: 'Store', tenantId: tenant.id } });
    console.log('Store:', store.id);
    const user = await prisma.user.create({
      data: { name: 'Test', email: 'test_register_' + Date.now() + '@example.com', password, tenantId: tenant.id, role: 'ADMIN', defaultStoreId: store.id }
    });
    console.log('User:', user.id);
    
    await prisma.treasuryAccount.createMany({
      data: [
        { name: 'CAISSE PRINCIPALE', type: 'CAISSE', tenantId: tenant.id }
      ]
    });
    console.log('Treasury OK');
    
    await prisma.customer.create({ data: { name: 'DIVERS', clientType: 'RETAIL', tenantId: tenant.id } });
    console.log('Customer OK');
    console.log('SUCCESS REGISTRATION VERIFIED!');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
