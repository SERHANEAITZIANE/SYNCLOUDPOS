import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('155.133.26.217', 22, 'root', 'pkn567ftXW3L')

print("Uploading Nginx config...")
sftp = client.open_sftp()
sftp.put('nginx-syncloudpos.conf', '/etc/nginx/sites-available/syncloudpos')
sftp.close()

stdin, stdout, stderr = client.exec_command('nginx -t && systemctl reload nginx')
print(stdout.read().decode())
print(stderr.read().decode())
client.close()
