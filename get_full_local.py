import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

commands = [
    "su - postgres -c \"psql -c '\\l' > /tmp/out.txt\"",
    "su - postgres -c \"psql -c '\\du' >> /tmp/out.txt\"",
    "cat /tmp/out.txt"
]

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    with open('local_db_out.txt', 'w', encoding='utf-8') as f:
        for cmd in commands:
            if "cat" in cmd:
                stdin, stdout, stderr = client.exec_command(cmd)
                out = stdout.read().decode('utf-8')
                f.write(out)
            else:
                client.exec_command(cmd)

    client.close()
except Exception as e:
    sys.exit(1)
