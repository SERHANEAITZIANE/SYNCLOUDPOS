import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('155.133.26.217', 22, 'root', 'pkn567ftXW3L')

script = """
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findUnique({ where: { email: 'xm@live.fr' } });
    console.log(user ? `email: ${user.email}, role: ${user.role}, isSuperadmin: ${user.isSuperadmin}` : 'User not found');
}
main().finally(() => prisma.$disconnect());
"""

client.exec_command(f"cat << 'EOF' > /var/www/syncloudpos/check_super.js\n{script}\nEOF")
stdin, stdout, stderr = client.exec_command("cd /var/www/syncloudpos && node check_super.js")
print("OUT:", stdout.read().decode())
print("ERR:", stderr.read().decode())
client.close()
