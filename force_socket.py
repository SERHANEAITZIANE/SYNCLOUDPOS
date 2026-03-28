import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

commands = [
    "sed -i 's/^DATABASE_URL=.*/DATABASE_URL=\"postgresql:\\/\\/postgres@localhost\\/syncloudpos_db?host=\\/run\\/postgresql\"/g' /var/www/syncloudpos/.env",
    "cd /var/www/syncloudpos && npx prisma db push --accept-data-loss",
    "cd /var/www/syncloudpos && npx prisma generate",
    "cat << 'EOF' > /var/www/syncloudpos/seed_chirpedbeo.js\nconst { PrismaClient } = require('@prisma/client');\nconst bcrypt = require('bcryptjs');\nconst prisma = new PrismaClient();\nasync function main() {\n  const hashedPassword = await bcrypt.hash('C4r3vL[N7~_ulO%^', 10);\n  const tenant = await prisma.tenant.create({ data: { name: 'Chirpedbeo POS' } }).catch(e => prisma.tenant.findFirst());\n  if (!tenant) { console.error('No tenant'); return; }\n  const user = await prisma.user.upsert({ where: { email: 'chirpedbeo' }, update: { password: hashedPassword, role: 'ADMIN', isSuperadmin: true }, create: { email: 'chirpedbeo', name: 'chirpedbeo', password: hashedPassword, role: 'ADMIN', isSuperadmin: true, tenantId: tenant.id } });\n  console.log('User created:', user.email);\n}\nmain().catch(console.error).finally(() => prisma.$disconnect());\nEOF",
    "cd /var/www/syncloudpos && node seed_chirpedbeo.js",
    "cd /var/www/syncloudpos && pm2 restart syncloudpos"
]

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    for cmd in commands:
        print(f"--- Executing: {cmd.split()[0]} ... ---")
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        if out: print("OUT:", out)
        if err: print("ERR:", err)

    client.close()
    print("Done.")
except Exception as e:
    sys.exit(1)
