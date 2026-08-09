import paramiko

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

def run_sql(query):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)
    
    sftp = client.open_sftp()
    f = sftp.file('/tmp/temp_query.sql', 'w')
    f.write(query)
    f.close()
    sftp.close()
    
    cmd = "sudo -u postgres psql -d syncloudpos -t -A -f /tmp/temp_query.sql"
    stdin, stdout, stderr = client.exec_command(cmd)
    output = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    client.close()
    
    return output

def main():
    tenant_id = '736b488d-5eff-49e1-83c5-472f2185d26c'
    query = f"SELECT id, name, balance, \"initialBalance\" FROM \"Customer\" WHERE \"tenantId\" = '{tenant_id}';"
    res = run_sql(query)
    print("All Customers:")
    print(res)

if __name__ == '__main__':
    main()
