import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

commands = [
    "su - postgres -c \"psql -d syncloudpos_db -c \\\"SELECT email FROM \\\\\\\"User\\\\\\\" WHERE email LIKE '%chirpedbeo%';\\\"\""
]

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    for cmd in commands:
        print(f"--- Executing: {cmd} ---")
        stdin, stdout, stderr = client.exec_command(cmd)
        print("OUT:", stdout.read().decode('utf-8'))
        err = stderr.read().decode('utf-8')
        if err: print("ERR:", err)

    client.close()
except Exception as e:
    sys.exit(1)
