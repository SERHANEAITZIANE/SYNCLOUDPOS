import paramiko

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port, username, password, timeout=10)
client.get_transport().set_keepalive(15)

# Check build result
stdin, stdout, stderr = client.exec_command("tail -30 /tmp/build.log 2>/dev/null", timeout=10)
stdout.channel.recv_exit_status()
print("=== BUILD LOG (last 30 lines) ===")
print(stdout.read().decode('utf-8'))

# Check PM2
stdin, stdout, stderr = client.exec_command("pm2 status 2>/dev/null", timeout=10)
stdout.channel.recv_exit_status()
print("=== PM2 STATUS ===")
print(stdout.read().decode('utf-8'))

# Check if app responds
stdin, stdout, stderr = client.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null", timeout=10)
stdout.channel.recv_exit_status()
print(f"App HTTP status: {stdout.read().decode('utf-8')}")

client.close()
