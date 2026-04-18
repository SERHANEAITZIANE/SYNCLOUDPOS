import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('155.133.26.217', 22, 'root', 'pkn567ftXW3L')

js_code = """
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Admin123!', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@admin.com' },
    update: { password: hash, isSuperadmin: true, role: 'ADMIN' },
    create: {
      email: 'admin@admin.com',
      name: 'Admin Test',
      password: hash,
      isSuperadmin: true,
      role: 'ADMIN',
      tenantId: 'some-dummy-tenant-if-needed' // will fail if tenantId is required and foreign key missing
    }
  });
  console.log(user ? 'Admin updated' : 'Error');
}
main().catch(console.error).finally(() => prisma.$disconnect());
"""

client.exec_command(f"cat << 'EOF' > /var/www/syncloudpos/reset_admin.js\n{js_code}\nEOF")
stdin, stdout, stderr = client.exec_command("cd /var/www/syncloudpos && node reset_admin.js")
print(stdout.read().decode().strip())
client.close()
