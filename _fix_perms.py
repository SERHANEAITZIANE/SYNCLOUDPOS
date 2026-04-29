import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('155.133.26.217', 22, 'root', 'pkn567ftXW3L')

js = """
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const u = await p.user.findFirst({ where: { email: 'xm@live.fr' } });
  console.log('canEdit:', u.canEdit, 'canDelete:', u.canDelete, 'isSuperadmin:', u.isSuperadmin, 'role:', u.role);
  await p.user.update({ where: { id: u.id }, data: { canEdit: true, canDelete: true } });
  console.log('Updated canEdit=true, canDelete=true');
}
main().catch(e => console.error(e)).finally(() => p.$disconnect());
"""

c.exec_command(f"cat << 'JSEOF' > /var/www/syncloudpos/_fix_perms.js\n{js}\nJSEOF")
import time; time.sleep(1)
stdin, stdout, stderr = c.exec_command("cd /var/www/syncloudpos && node _fix_perms.js")
stdout.channel.recv_exit_status()
print(stdout.read().decode())
print(stderr.read().decode())
c.close()
