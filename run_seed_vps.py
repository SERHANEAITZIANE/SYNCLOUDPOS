import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

# The git hook deploys to /var/www/syncloudpos
commands = [
    "cd /var/www/syncloudpos && npx tsx scripts/seed-volume.ts"
]

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    with open('remote_seed_out.txt', 'w', encoding='utf-8') as f:
        for cmd in commands:
            f.write(f"\n--- Executing: {cmd} ---\n")
            print(f"Executing: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            # This is a long-running process, we'll stream the output
            while not stdout.channel.exit_status_ready():
                if stdout.channel.recv_ready():
                    out_chunk = stdout.channel.recv(1024).decode('utf-8', errors='replace')
                    sys.stdout.write(out_chunk)
                    sys.stdout.flush()
                    f.write(out_chunk)
            
            exit_status = stdout.channel.recv_exit_status()
            out = stdout.read().decode('utf-8', errors='replace')
            err = stderr.read().decode('utf-8', errors='replace')
            sys.stdout.write(out)
            sys.stderr.write(err)
            f.write(out)
            if err:
                f.write(f"\nSTDERR:\n{err}\n")
            f.write(f"\nExit status: {exit_status}\n")

    client.close()
    print("All commands executed.")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
