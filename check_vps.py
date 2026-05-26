import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

host = '155.133.26.217'
port = 22
username = 'root'
password = 'C4r3vL[N7~_ulO%^'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port, username, password)

def run_cmd(cmd):
    print(f"\n=== {cmd} ===\n")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out: print(out)
    if err: print("ERR:", err)

# Check PM2 logs for errors
run_cmd("pm2 logs syncloudpos --lines 60 --nostream --err")
run_cmd("pm2 logs syncloudpos --lines 40 --nostream")

client.close()
