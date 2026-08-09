import paramiko

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

commands = [
    "ls -lt /var/www/syncloudpos/.next/ | head -n 10",
    "ls -lt /var/www/syncloudpos/ | head -n 20",
    "tail -n 50 /var/www/syncloudpos/build_output.log",
    "tail -n 50 /var/www/syncloudpos/build.log"
]

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    with open('vps_build_check.txt', 'w', encoding='utf-8') as f:
        for cmd in commands:
            f.write(f"\n==========================================\n")
            f.write(f"Executing: {cmd}\n")
            f.write(f"==========================================\n")
            stdin, stdout, stderr = client.exec_command(cmd)
            exit_status = stdout.channel.recv_exit_status()
            out = stdout.read().decode('utf-8', errors='replace')
            err = stderr.read().decode('utf-8', errors='replace')
            f.write(out)
            if err:
                f.write("\nSTDERR:\n")
                f.write(err)
            f.write(f"\nExit status: {exit_status}\n")

    client.close()
    print("Done")
except Exception as e:
    print(f"Error: {e}")
