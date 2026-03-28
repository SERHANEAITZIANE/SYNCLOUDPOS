import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('155.133.26.217', 22, 'root', 'pkn567ftXW3L')
prompt = "sudo -u postgres psql -d syncloudpos -x -c 'SELECT * FROM \"User\";'"
stdin, stdout, stderr = client.exec_command(prompt)
print("Users:", stdout.read().decode())
prompt2 = "sudo -u postgres psql -d syncloudpos -x -c 'SELECT * FROM \"Tenant\";'"
stdin, stdout, stderr = client.exec_command(prompt2)
print("Tenants:", stdout.read().decode())
client.close()
