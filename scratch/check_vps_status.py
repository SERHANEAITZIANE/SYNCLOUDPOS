import paramiko

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password, timeout=10)
    print("Connected to VPS!")
    
    # Check for active node/npm/next/git processes
    stdin, stdout, stderr = client.exec_command("ps aux | grep -E 'npm|node|next|git'")
    out = stdout.read().decode('utf-8', errors='replace')
    print("Active node/npm/next/git processes on VPS:")
    print(out.encode('ascii', 'replace').decode('ascii'))
    
    client.close()
except Exception as e:
    print(f"Failed to connect or run check: {e}")
