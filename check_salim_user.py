import paramiko

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'
tenant_id = '736b488d-5eff-49e1-83c5-472f2185d26c'

js_code = f"""
const {{ PrismaClient }} = require('/var/www/syncloudpos/node_modules/@prisma/client');
const db = new PrismaClient();

const tenantId = "{tenant_id}";

async function test() {{
    try {{
        console.log("Checking users for tenant:", tenantId);
        const users = await db.user.findMany({{
            where: {{ tenantId }}
        }});
        console.log("Users for this tenant:", users.map(u => ({{ id: u.id, email: u.email, tenantId: u.tenantId }})));

        console.log("Checking if salimzsec@gmail.com exists anywhere in DB:");
        const anySalim = await db.user.findFirst({{
            where: {{ email: "salimzsec@gmail.com" }}
        }});
        console.log("Found salim:", anySalim ? {{ id: anySalim.id, email: anySalim.email, tenantId: anySalim.tenantId }} : "NOT FOUND");

    }} catch (err) {{
        console.error("Prisma error:", err);
    }} finally {{
        await db.$disconnect();
    }}
}}

test();
"""

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    sftp = client.open_sftp()
    f = sftp.file('/tmp/check_salim_user.js', 'w')
    f.write(js_code)
    f.close()
    sftp.close()

    cmd = "cd /var/www/syncloudpos && node /tmp/check_salim_user.js"
    stdin, stdout, stderr = client.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')

    print("STDOUT:")
    print(out)
    if err:
        print("STDERR:")
        print(err)
    print(f"Exit status: {exit_status}")

    client.close()
except Exception as e:
    print(f"Error: {e}")
