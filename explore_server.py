import paramiko
import sys

host = 'chirpedbeo.online'
port = 22
username = 'chirpedbeo'
password = 'C4r3vL[N7~_ulO%^'

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    def run(cmd):
        print(f"--- {cmd} ---")
        stdin, stdout, stderr = client.exec_command(cmd)
        print(stdout.read().decode('utf-8', errors='replace'))
        err = stderr.read().decode('utf-8', errors='replace')
        if err:
            print("ERR:\n" + err)

    run("uname -a")
    run("pwd")
    run("ls -la")
    run("pm2 status || echo 'no pm2'")
    run("node -v || echo 'no node'")

    client.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
