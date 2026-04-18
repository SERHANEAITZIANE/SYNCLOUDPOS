import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'chirpedbeo'
password = 'C4r3vL[N7~_ulO%^'

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password, timeout=5)
    print("Success: connected to IP!")
    client.close()
except Exception as e:
    print(f"Error on IP: {e}")

host2 = '155.133.26.217'
port2 = 21098
try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host2, port2, username, password, timeout=5)
    print("Success: connected to IP on 21098!")
    client.close()
except Exception as e:
    pass

