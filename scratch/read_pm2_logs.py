import paramiko

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port, username, password)

cmd = 'tail -n 150 /var/log/pm2/syncloudpos-error.log'
stdin, stdout, stderr = client.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')

with open('scratch/pm2_errors.txt', 'w', encoding='utf-8') as f:
    f.write("=== STDOUT ===\n")
    f.write(out)
    f.write("\n=== STDERR ===\n")
    f.write(err)

client.close()
print("Done")
