import paramiko

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port, username, password)

# Check the build log
stdin, stdout, stderr = client.exec_command("cat /tmp/build.log 2>/dev/null | tail -40")
stdout.channel.recv_exit_status()
print("BUILD LOG (last 40 lines):")
print(stdout.read().decode('utf-8'))

# Check if build is still running
stdin, stdout, stderr = client.exec_command("pgrep -a -f 'next build' 2>/dev/null")
stdout.channel.recv_exit_status()
out = stdout.read().decode('utf-8')
print(f"\nBuild process running: {'YES' if out.strip() else 'NO'}")
if out.strip():
    print(out)

# PM2 status
stdin, stdout, stderr = client.exec_command("pm2 status 2>/dev/null")
stdout.channel.recv_exit_status()
print("\nPM2 Status:")
print(stdout.read().decode('utf-8'))

client.close()
