import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(host, port, username, password, timeout=10)
    
    # Query database roles count
    query = "sudo -u postgres psql -d syncloudpos -c \"SELECT role, COUNT(*) FROM \\\"User\\\" GROUP BY role;\""
    stdin, stdout, stderr = client.exec_command(query)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    print("=== Role Distribution ===")
    print(out)
    
    # Query users that are NOT ADMIN
    query2 = "sudo -u postgres psql -d syncloudpos -c \"SELECT id, name, email, role FROM \\\"User\\\" WHERE role != 'ADMIN';\""
    stdin, stdout, stderr = client.exec_command(query2)
    out2 = stdout.read().decode('utf-8', errors='replace').strip()
    print("\n=== Non-ADMIN Users ===")
    print(out2)
    
    client.close()
except Exception as e:
    print(f"Error: {e}")
