import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

commands = [
    "kill -9 $(pgrep -f 'next build') 2>/dev/null; echo 'killed stale builds'",
    "cd /var/www/syncloudpos && NODE_OPTIONS='--max-old-space-size=512' npx next build 2>&1 | tail -30",
    "cd /var/www/syncloudpos && pm2 restart syncloudpos",
    "pm2 status"
]

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    for cmd in commands:
        label = cmd.split('&&')[-1].strip()[:60]
        print(f"\n--- {label} ---")
        stdin, stdout, stderr = client.exec_command(cmd, timeout=600)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        if out: print("OUT:", out[-1000:])
        if err: print("ERR:", err[-500:])
        print(f"Exit: {exit_status}")

    client.close()
    print("\nDeploy complete!")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
