import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

commands = [
    "echo \"SELECT id, email, name, role FROM \\\"User\\\" WHERE email='chirpedbeo.online' OR email='chirpedbeo' OR name='chirpedbeo';\" > /tmp/check.sql",
    "sudo u postgres psql -d syncloudpos -f /tmp/check.sql",
    "su - postgres -c \"psql -d syncloudpos -f /tmp/check.sql\""
]

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    for cmd in commands:
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        if out: print("OUT:", out)
        if err: print("ERR:", err)

    client.close()
except Exception as e:
    sys.exit(1)
