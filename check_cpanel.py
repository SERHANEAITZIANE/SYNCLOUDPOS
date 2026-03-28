import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('155.133.26.217', 22, 'root', 'pkn567ftXW3L')
prompt = "ps aux | grep -i cpanel; psql -U postgres -x -c '\\du'"
stdin, stdout, stderr = client.exec_command(prompt)
print("Remote outputs:", stdout.read().decode())
print("Remote errors:", stderr.read().decode())
client.close()
