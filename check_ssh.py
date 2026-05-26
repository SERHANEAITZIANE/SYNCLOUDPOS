import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'C4r3vL[N7~_ulO%^'

print(f"Connecting to {host}...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(host, port, username, password, timeout=10)
    print("Connected successfully!")
    stdin, stdout, stderr = client.exec_command("ls -la '/var/www/syncloudpos/src/app/[locale]/(dashboard)/driver-tracking/'")
    print("STDOUT:")
    print(stdout.read().decode('utf-8'))
    print("STDERR:")
    print(stderr.read().decode('utf-8'))
    client.close()
except Exception as e:
    print(f"Connection failed: {e}")
