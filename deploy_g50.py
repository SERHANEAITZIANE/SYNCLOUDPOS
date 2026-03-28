import paramiko
import time
import os
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

local_base = r'c:\Users\tre\Documents\SYNCLOUDPOS'
remote_base = '/var/www/syncloudpos'

files_to_upload = [
    ('src/app/[locale]/(dashboard)/fiscal/components/g50-print-template.tsx',
     'src/app/\\[locale\\]/\\(dashboard\\)/fiscal/components/g50-print-template.tsx'),
    ('src/app/[locale]/(dashboard)/fiscal/components/g12-print-template.tsx',
     'src/app/\\[locale\\]/\\(dashboard\\)/fiscal/components/g12-print-template.tsx'),
]

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)
    client.get_transport().set_keepalive(15)

    sftp = client.open_sftp()

    for local_rel, _ in files_to_upload:
        local_path = os.path.join(local_base, local_rel)
        # On the server, the paths use actual brackets
        remote_path = f"{remote_base}/{local_rel}"
        print(f"Uploading {local_rel}...")
        sftp.put(local_path, remote_path)
        print(f"  -> {remote_path}")

    sftp.close()
    print("All files uploaded successfully.")

    # Start build in background
    print("Starting build in background...")
    cmd = f"cd {remote_base} && nohup bash -c 'NODE_OPTIONS=\"--max-old-space-size=512\" npx next build > /tmp/build_g50.log 2>&1 && pm2 restart syncloudpos >> /tmp/build_g50.log 2>&1' &"
    client.exec_command(cmd)
    print("Build started. Polling for completion...")

    time.sleep(15)

    for i in range(30):
        time.sleep(20)
        stdin, stdout, stderr = client.exec_command("tail -3 /tmp/build_g50.log 2>/dev/null; echo '|||'; pgrep -c -f 'next build' 2>/dev/null || echo 0", timeout=10)
        stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8')
        parts = out.split('|||')
        log_tail = parts[0].strip() if parts else ''
        build_count = parts[1].strip() if len(parts) > 1 else '?'

        print(f"[{(i+1)*20}s] Processes: {build_count} | Log: {log_tail[-80:]}")

        if build_count == '0' or 'Ready' in log_tail or 'restart' in log_tail.lower() or 'error' in log_tail.lower():
            print("\nBuild finished!")
            # Show final log
            stdin, stdout, stderr = client.exec_command("tail -10 /tmp/build_g50.log 2>/dev/null", timeout=10)
            stdout.channel.recv_exit_status()
            print(stdout.read().decode('utf-8'))
            break

    client.close()
    print("Done.")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
