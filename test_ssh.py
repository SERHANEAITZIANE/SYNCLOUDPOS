import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('chirpedbeo.online', 22, 'chirpedbeo', 'C4r3vL[N7~_ulO%^')

stdin, stdout, stderr = client.exec_command("ls -la /var/www || ls -la")
print("Output:", stdout.read().decode('utf-8'))
print("Error:", stderr.read().decode('utf-8'))
client.close()
