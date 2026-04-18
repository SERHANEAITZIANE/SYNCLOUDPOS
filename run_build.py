import paramiko
import sys
import io

# Disable buffering so we see the output live
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port, username, password)

def run_cmd(cmd):
    print(f"\n--- Running: {cmd} ---\n", flush=True)
    stdin, stdout, stderr = client.exec_command(cmd)
    
    # Read output line by line
    for line in iter(stdout.readline, ""):
        print(line, end="", flush=True)
        
    for line in iter(stderr.readline, ""):
        print(line, end="", flush=True)
        
    exit_status = stdout.channel.recv_exit_status()
    print(f"\nExit code: {exit_status}\n", flush=True)
    return exit_status

# Run the build!
print("Starting build process on VPS...")
run_cmd("cd /var/www/syncloudpos && npx prisma@5.22.0 generate")
run_cmd("cd /var/www/syncloudpos && npm run build")
run_cmd("pm2 restart syncloudpos")

client.close()
