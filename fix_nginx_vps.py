import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

try:
    print("Connecting...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    print("Uploading nginx config...")
    sftp = client.open_sftp()
    sftp.put('nginx-syncloudpos.conf', '/etc/nginx/sites-available/syncloudpos')
    sftp.put('nginx-syncloudpos.conf', '/var/www/syncloudpos/nginx-syncloudpos.conf')
    sftp.close()

    print("Checking nginx syntax...")
    stdin, stdout, stderr = client.exec_command("nginx -t")
    print(stdout.read().decode())
    err = stderr.read().decode()
    if "successful" in err:
        print("NGINX syntax OK:", err)
        print("Reloading nginx...")
        client.exec_command("systemctl reload nginx")
    else:
        print("NGINX SYNTAX ERROR:", err)

    print("Done!")
    client.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
