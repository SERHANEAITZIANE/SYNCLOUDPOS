import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

node_script = """
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('C4r3vL[N7~_ulO%^', 10);
    
    // Create tenant
    const tenant = await prisma.tenant.create({
        data: {
            name: 'Chirpedbeo POS',
            email: 'chirpedbeo@chirpedbeo.online',
            isActive: true
        }
    }).catch(e => prisma.tenant.findFirst());
    
    if (!tenant) {
       console.error("Failed to create or find tenant");
       return;
    }

    // Create user
    const user = await prisma.user.upsert({
        where: { email: 'chirpedbeo' },
        update: { password: hashedPassword, role: 'ADMIN', isSuperadmin: true },
        create: {
            email: 'chirpedbeo',
            name: 'chirpedbeo',
            password: hashedPassword,
            role: 'ADMIN',
            isSuperadmin: true,
            tenantId: tenant.id
        }
    });
    
    console.log("User created successfully: ", user.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
"""

commands = [
    "cd /var/www/syncloudpos && npx prisma db push --accept-data-loss",
    "cd /var/www/syncloudpos && npx prisma generate",
    "cat << 'EOF' > /var/www/syncloudpos/seed_chirpedbeo.js\n" + node_script + "\nEOF",
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
