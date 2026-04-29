import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('155.133.26.217', 22, 'root', 'pkn567ftXW3L')

js = """
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'xm@live.fr' } });
  if (!user) { console.log('USER NOT FOUND'); return; }
  console.log('ID:', user.id);
  console.log('Email:', user.email);
  
  const hash = await bcrypt.hash('Babez@16', 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hash, isSuperadmin: true } });
  console.log('Password reset to Babez@16 and superadmin confirmed.');
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
"""

client.exec_command(f"cat << 'JSEOF' > /var/www/syncloudpos/_fix_user.js\n{js}\nJSEOF")
import time; time.sleep(1)
stdin, stdout, stderr = client.exec_command("cd /var/www/syncloudpos && node _fix_user.js")
stdout.channel.recv_exit_status()
print(stdout.read().decode('utf-8', errors='replace'))
err = stderr.read().decode('utf-8', errors='replace')
if err: print("Error:", err)
client.close()
print("Done.")
