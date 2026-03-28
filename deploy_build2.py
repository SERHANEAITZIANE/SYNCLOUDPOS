import paramiko
import time
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    # Kill any stale builds first
    print("Killing stale builds...")
    client.exec_command("pkill -f 'next build' 2>/dev/null")
    time.sleep(2)

    # Start build in background with nohup
    print("Starting build in background...")
    cmd = "cd /var/www/syncloudpos && nohup bash -c 'NODE_OPTIONS=\"--max-old-space-size=512\" npx next build > /tmp/build.log 2>&1 && pm2 restart syncloudpos >> /tmp/build.log 2>&1' &"
    client.exec_command(cmd)
    print("Build started in background on VPS.")
    print("Waiting 10 seconds to check initial output...")
    time.sleep(10)

    # Check if build started
    stdin, stdout, stderr = client.exec_command("cat /tmp/build.log 2>/dev/null | tail -5")
    stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8')
    print(f"Initial log:\n{out}")

    # Now poll every 30s for up to 10 minutes
    for i in range(20):
        time.sleep(30)
        stdin, stdout, stderr = client.exec_command("cat /tmp/build.log 2>/dev/null | tail -10")
        stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8')
        print(f"\n--- Check {i+1} ({(i+1)*30}s) ---")
        print(out)
        
        if "✓ Ready" in out or "Restarting" in out or "restart" in out.lower() or "Build error" in out or "Error" in out:
            print("\nBuild appears to have finished!")
            break
    
    # Final status
    stdin, stdout, stderr = client.exec_command("pm2 status")
    stdout.channel.recv_exit_status()
    print("\nPM2 status:")
    print(stdout.read().decode('utf-8'))

    client.close()
    print("Done.")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
