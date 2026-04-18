import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('155.133.26.217', 22, 'root', 'pkn567ftXW3L')
stdin, stdout, stderr = client.exec_command('pm2 logs syncloudpos --lines 200 --nostream')
print("--- STDOUT ---")
print(stdout.read().decode())
client.close()
