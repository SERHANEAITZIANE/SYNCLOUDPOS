import paramiko
import sys
import os

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

local_script = 'link_user.js'
remote_script = '/var/www/syncloudpos/link_user.js'

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    print("Connected via SSH")
    
    # Upload the script
    sftp = client.open_sftp()
    sftp.put(local_script, remote_script)
    sftp.close()
    print("Script uploaded")

    # Run the script
    cmd = "cd /var/www/syncloudpos && node link_user.js"
    print(f"Executing: {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    
    # Print the output
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    
    print("STDOUT:")
    print(out)
    
    if err:
        print("STDERR:")
        print(err)
        
    print(f"Exit status: {exit_status}")

    # Remove the remote script to clean up
    sftp = client.open_sftp()
    try:
        sftp.remove(remote_script)
    except:
        pass
    sftp.close()

    client.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
