import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('155.133.26.217', 22, 'root', 'pkn567ftXW3L', timeout=30)

stdin, stdout, stderr = c.exec_command('pm2 restart syncloudpos', timeout=30)
exit_s = stdout.channel.recv_exit_status()
print(stdout.read().decode('utf-8', errors='replace')[:500])
print(f"Exit: {exit_s}")
c.close()
print("Done! PM2 restarted.")
