import subprocess, sys

try:
    import paramiko
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "paramiko", "-q"], check=True)
    import paramiko

host = '155.133.26.217'
port = 21098
username = 'chirpedbeo'
password = 'C4r3vL[N7~_ulO%^'

print(f"Connecting to {host}:{port} as {username}...")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, port, username, password, timeout=15)
    print("SSH connected!\n")
except Exception as e:
    print(f"SSH on port {port} failed: {e}")
    print("Trying port 22...")
    try:
        client.connect(host, 22, username, password, timeout=15)
        print("SSH connected on port 22!\n")
    except Exception as e2:
        print(f"SSH on port 22 also failed: {e2}")
        sys.exit(1)

def run(cmd, sudo=False):
    if sudo:
        cmd = f"echo '{password}' | sudo -S {cmd}"
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(out)
    if err and 'sudo' not in err and 'password' not in err.lower():
        print("[stderr]", err)
    return out

print("=== PostgreSQL Service Status ===")
run("systemctl status postgresql --no-pager -l", sudo=True)

print("\n=== PostgreSQL Processes ===")
run("ps aux | grep postgres | grep -v grep")

print("\n=== Disk Space ===")
run("df -h /")

print("\n=== Memory ===")
run("free -m")

print("\n=== PostgreSQL Logs (last 30 lines) ===")
run("sudo journalctl -u postgresql -n 30 --no-pager", sudo=True)

print("\n=== Attempting to restart PostgreSQL ===")
run("sudo systemctl restart postgresql", sudo=True)

import time
time.sleep(3)

print("\n=== PostgreSQL Status After Restart ===")
run("systemctl is-active postgresql", sudo=True)

print("\n=== Check pg_hba.conf ===")
run("sudo cat /etc/postgresql/*/main/pg_hba.conf | tail -20", sudo=True)

print("\n=== Check postgresql.conf listen_addresses ===")
run("sudo grep -E 'listen_addresses|port|max_connections' /etc/postgresql/*/main/postgresql.conf | grep -v '#'", sudo=True)

print("\n=== Test local DB connection from VPS ===")
run("sudo -u postgres psql -c '\\l' 2>&1 | head -20", sudo=True)

print("\n=== Check syncloudpos DB users ===")
run("sudo -u postgres psql syncloudpos -c '\\du' 2>&1", sudo=True)

print("\n=== Check admin user permissions ===")
run("sudo -u postgres psql syncloudpos -c \"SELECT usename, usesuper, usecreatedb FROM pg_user WHERE usename='admin';\" 2>&1", sudo=True)

print("\n=== Test connection as admin from VPS ===")
run("PGPASSWORD=admin123 psql -U admin -h 127.0.0.1 -d syncloudpos -c 'SELECT COUNT(*) FROM \"User\";' 2>&1", sudo=False)

client.close()
print("\nDone.")
