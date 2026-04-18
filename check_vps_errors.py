import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('155.133.26.217', 22, 'root', 'pkn567ftXW3L')

with open('vps_health.txt', 'w', encoding='utf-8') as f:
    f.write("=== NGINX ERRORS ===\n")
    stdin, stdout, stderr = client.exec_command('tail -n 20 /var/log/nginx/syncloudpos-error.log')
    f.write(stdout.read().decode('utf-8', errors='replace') + "\n")

    f.write("=== PM2 ERRORS ===\n")
    stdin, stdout, stderr = client.exec_command('pm2 logs syncloudpos --nostream --lines 50')
    f.write(stdout.read().decode('utf-8', errors='replace') + "\n")
    f.write(stderr.read().decode('utf-8', errors='replace') + "\n")

client.close()
