import paramiko, sys, io, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('155.133.26.217', 22, 'root', 'pkn567ftXW3L')

def run(cmd, timeout=600):
    print(f"\n--- {cmd} ---")
    stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out: print(out[-3000:])
    if err: print("ERR:", err[-2000:])
    print(f"Exit: {exit_status}")
    return out, err, exit_status

sftp = c.open_sftp()
sftp.put('src/components/payments/cell-action.tsx', '/var/www/syncloudpos/src/components/payments/cell-action.tsx')
sftp.put('src/actions/payments.ts', '/var/www/syncloudpos/src/actions/payments.ts')
sftp.put('src/actions/customers.ts', '/var/www/syncloudpos/src/actions/customers.ts')
sftp.put('src/actions/suppliers.ts', '/var/www/syncloudpos/src/actions/suppliers.ts')
sftp.put('src/components/emprunt/cell-action.tsx', '/var/www/syncloudpos/src/components/emprunt/cell-action.tsx')
sftp.put('src/components/emprunt/columns.tsx', '/var/www/syncloudpos/src/components/emprunt/columns.tsx')
sftp.put('src/components/emprunt-fournisseur/cell-action.tsx', '/var/www/syncloudpos/src/components/emprunt-fournisseur/cell-action.tsx')
sftp.put('src/components/emprunt-fournisseur/columns.tsx', '/var/www/syncloudpos/src/components/emprunt-fournisseur/columns.tsx')
print("Uploaded files")
sftp.close()

run("pm2 stop syncloudpos")
out, err, status = run("cd /var/www/syncloudpos && NODE_OPTIONS='--max-old-space-size=1024' npx next build 2>&1 | tail -10", timeout=600)
if status != 0:
    print("BUILD FAILED!")
    run("cd /var/www/syncloudpos && NODE_OPTIONS='--max-old-space-size=1024' npx next build 2>&1 | grep -B2 -A5 'Error'")
else:
    print("BUILD OK")
run("pm2 restart syncloudpos")
time.sleep(5)
run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/login")
c.close()
print("Done!")
