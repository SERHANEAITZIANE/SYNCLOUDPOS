import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('155.133.26.217', 22, 'root', 'pkn567ftXW3L')

js_code = """
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = 'testsuperadmin@test.com';
  let user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    const hash = await bcrypt.hash('Test1234!!', 10);
    const tenant = await prisma.tenant.create({ data: { name: 'Test Tenant' } });
    const store = await prisma.store.create({ data: { name: 'Test Store', tenantId: tenant.id } });
    
    user = await prisma.user.create({
      data: {
        email,
        name: 'Test Superadmin',
        password: hash,
        isSuperadmin: true,
        role: 'ADMIN',
        tenantId: tenant.id,
        defaultStoreId: store.id
      }
    });
  } else {
    // just ensure superadmin and password is set
    const hash = await bcrypt.hash('Test1234!!', 10);
    user = await prisma.user.update({
      where: { email },
      data: { isSuperadmin: true, role: 'ADMIN', password: hash }
    });
  }
  console.log('User guaranteed:', user.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
"""

client.exec_command(f"cat << 'EOF' > /var/www/syncloudpos/seed_test_admin.js\n{js_code}\nEOF")
stdin, stdout, stderr = client.exec_command("cd /var/www/syncloudpos && node seed_test_admin.js")
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if err: print("ERR:", err)
print(out)
client.close()
