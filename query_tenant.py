import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('155.133.26.217', 22, 'root', 'pkn567ftXW3L')

query = 'SELECT id, email, "tenantId" FROM "User" WHERE email = $$salimzsec@gmail.com$$;'
prompt = f"sudo -u postgres psql -d syncloudpos -x -c '{query}'"

stdin, stdout, stderr = client.exec_command(prompt)
print(stdout.read().decode())

client.close()
