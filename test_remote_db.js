const { PrismaClient } = require('@prisma/client');

async function test(url) {
  console.log('Testing', url);
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const user = await prisma.user.findFirst({ where: { email: 'xm@live.fr' } });
    console.log('Success, found user:', !!user);
  } catch (e) {
    console.error('Failed:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test('postgresql://syncloudpos:SyncloudDB_2026_Pos@155.133.26.217:5432/syncloudpos_db?schema=public');
test('postgresql://syncloudpos:SyncloudDB_2026_Pos@155.133.26.217:5432/syncloudpos?schema=public');
test('postgresql://syncloudpos:SyncloudDB_2026_Pos@155.133.26.217:5433/syncloudpos?pgbouncer=true');
