import paramiko

host = '155.133.26.217'
port = 22

# First try the user's new credentials
try:
    print("Trying new credentials...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username='chirpedbeo', password='C4r3vL[N7~_ulO%^', timeout=5)
    print("SUCCESS with chirpedbeo")
    client.close()
except Exception as e:
    print(f"FAILED with chirpedbeo: {e}")

# Then try the old root credentials
try:
    print("Trying old root credentials...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username='root', password='pkn567ftXW3L', timeout=5)
    print("SUCCESS with root")
    client.close()
except Exception as e:
    print(f"FAILED with root: {e}")
