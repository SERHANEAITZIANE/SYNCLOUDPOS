import paramiko

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port, username, password, timeout=10)
client.get_transport().set_keepalive(15)

stdin, stdout, stderr = client.exec_command("wc -l /tmp/build_g50.log 2>/dev/null; echo '---'; tail -10 /tmp/build_g50.log 2>/dev/null; echo '---'; pgrep -c -f 'next build' 2>/dev/null || echo 0", timeout=15)
stdout.channel.recv_exit_status()
print(stdout.read().decode('utf-8'))

client.close()
