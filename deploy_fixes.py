import paramiko, sys, io, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('155.133.26.217', 22, 'root', 'C4r3vL[N7~_ulO%^')

sftp = client.open_sftp()
files = [
    'src/components/pos/pos-client.tsx',
    'src/components/pos/cart-sidebar.tsx',
    'src/app/[locale]/(dashboard)/layout.tsx',
    'src/app/[locale]/(pos)/display/page.tsx',
    'src/app/[locale]/(superadmin)/layout.tsx',
    'src/app/[locale]/(dashboard)/hub/page.tsx',
    'src/app/[locale]/(dashboard)/hub/components/hub-client.tsx',
    'src/app/[locale]/(auth)/login/page.tsx',
    'src/app/[locale]/(auth)/register/page.tsx',
    'src/app/[locale]/(dashboard)/driver/page.tsx',
    'src/app/[locale]/(dashboard)/analytics/forecast/page.tsx',
    'src/app/[locale]/(dashboard)/catalog/components/catalog-client.tsx',
    'src/app/[locale]/(dashboard)/ai/components/ai-client.tsx'
]
for f in files:
    r = f'/var/www/syncloudpos/{f}'
    client.exec_command(f'mkdir -p {r.rsplit("/",1)[0]}')
    time.sleep(0.3)
    sftp.put(f, r)
    print(f'  ✓ {f}')
sftp.close()

def run(cmd):
    print(f'\n--- {cmd[:70]}... ---')
    i,o,e = client.exec_command(cmd, timeout=300)
    ex = o.channel.recv_exit_status()
    print(o.read().decode('utf-8',errors='replace'))
    if ex != 0:
        print(e.read().decode('utf-8',errors='replace'))
        sys.exit(1)

run('cd /var/www/syncloudpos && npm run build')
run('pm2 restart syncloudpos')
print('\n✅ Mobile touch scroll and layout vibration fixes deployed!')
client.close()
