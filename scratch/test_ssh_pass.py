import paramiko

host = '155.133.26.217'
port = 22
username = 'root'
passwords = ['pkn567ftXW3L', 'C4r3vL[N7~_ulO%^']

for pwd in passwords:
    print(f"Trying password: {pwd}")
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(host, port, username, pwd, timeout=5)
        print(f"Success! Correct password is: {pwd}")
        client.close()
        break
    except Exception as e:
        print(f"Failed: {e}")
