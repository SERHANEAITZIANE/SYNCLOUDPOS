import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('155.133.26.217', 22, 'root', 'pkn567ftXW3L')

js_code = """
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'xm@live.fr' } });
  if (!user) {
    console.log('NO USER FOUND');
  } else {
    console.log(user.password ? 'HAS PASSWORD' : 'NO PASSWORD');
  }
}
main().finally(() => prisma.$disconnect());
"""

client.exec_command(f"cat << 'EOF' > /var/www/syncloudpos/check_pwd.js\n{js_code}\nEOF")
stdin, stdout, stderr = client.exec_command("cd /var/www/syncloudpos && node check_pwd.js")
print(stdout.read().decode().strip())
client.close()
