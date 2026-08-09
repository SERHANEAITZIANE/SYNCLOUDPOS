import paramiko

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

def run_sql(db_name, query):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)
    
    sftp = client.open_sftp()
    f = sftp.file('/tmp/temp_query.sql', 'w')
    f.write(query)
    f.close()
    sftp.close()
    
    cmd = f"sudo -u postgres psql -d {db_name} -t -A -f /tmp/temp_query.sql"
    stdin, stdout, stderr = client.exec_command(cmd)
    output = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    client.close()
    
    return output, err

def main():
    dbs = ["syncloudpos", "syncloudpos_db", "solerp", "postgres"]
    for db in dbs:
        print(f"Checking DB: {db}...")
        try:
            # Check if User table exists
            table_check = f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'User');"
            res, err = run_sql(db, table_check)
            if "t" in res:
                query = "SELECT id, email, \"tenantId\" FROM \"User\" WHERE email = 'salimzsec@gmail.com';"
                user_res, user_err = run_sql(db, query)
                if user_res.strip():
                    print(f"  FOUND in {db}: {user_res.strip()}")
                else:
                    print(f"  User table exists in {db}, but user not found.")
            else:
                print(f"  No 'User' table in {db}.")
        except Exception as e:
            print(f"  Error checking {db}: {e}")

if __name__ == '__main__':
    main()
