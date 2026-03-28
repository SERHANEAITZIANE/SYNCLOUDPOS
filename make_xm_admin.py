import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

node_script = """
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'xm@live.fr';
    console.log(`Updating user ${email} to superadmin...`);

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.log(`Error: User ${email} not found! Please register on the site first.`);
        return;
    }

    const updatedUser = await prisma.user.update({
        where: { email },
        data: {
            role: 'ADMIN',
            isSuperadmin: true
        }
    });
    
    console.log(`User ${updatedUser.email} is now a superadmin.`);
    
    // Also update TenantUser
    if (updatedUser.tenantId) {
        await prisma.tenantUser.upsert({
            where: {
                userId_tenantId: {
                    userId: updatedUser.id,
                    tenantId: updatedUser.tenantId
                }
            },
            update: {
                role: 'ADMIN'
            },
            create: {
                userId: updatedUser.id,
                tenantId: updatedUser.tenantId,
                role: 'ADMIN'
            }
        });
        console.log('Tenant access updated to ADMIN.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
"""

commands = [
    "cat << 'EOF' > /var/www/syncloudpos/make_xm_admin_script.js\n" + node_script + "\nEOF",
    "cd /var/www/syncloudpos && node make_xm_admin_script.js"
]

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    for cmd in commands:
        stdin, stdout, stderr = client.exec_command(cmd)
        stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        if out: print("OUT:", out)
        if err: print("ERR:", err)

    client.close()
    print("Done.")
except Exception as e:
    sys.exit(1)
