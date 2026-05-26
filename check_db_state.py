import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('155.133.26.217', 22, 'root', 'C4r3vL[N7~_ulO%^')

cmds = [
    # Get chirpedbeo user details
    """su - postgres -c 'psql -d syncloudpos -c "SELECT u.id, u.name, u.email, u.\\"tenantId\\", u.\\"defaultStoreId\\", u.role FROM \\"User\\" u WHERE u.email LIKE '"'"'%chirpe%'"'"';"'""",
    # Check chirpedbeo tenant
    """su - postgres -c 'psql -d syncloudpos -c "SELECT id, name FROM \\"Tenant\\" WHERE name LIKE '"'"'%Chirpe%'"'"';"'""",
    # Check store for chirpedbeo tenant
    """su - postgres -c 'psql -d syncloudpos -c "SELECT id, name, \\"tenantId\\" FROM \\"Store\\" WHERE \\"tenantId\\" = '"'"'c8261226-379b-45e7-a661-4c00c563fdae'"'"';"'""",
    # Check products for chirpedbeo tenant
    """su - postgres -c 'psql -d syncloudpos -c "SELECT COUNT(*) FROM \\"Product\\" WHERE \\"tenantId\\" = '"'"'c8261226-379b-45e7-a661-4c00c563fdae'"'"';"'""",
    # Check the POS product loading - does it load from StoreProduct or Product?
    # Check products for the oran tenant (76be9c25) which has 79 products
    """su - postgres -c 'psql -d syncloudpos -c "SELECT p.name, p.stock, p.price, sp.stock as store_stock FROM \\"Product\\" p LEFT JOIN \\"StoreProduct\\" sp ON sp.\\"productId\\" = p.id WHERE p.\\"tenantId\\" = '"'"'76be9c25-306d-4022-8887-b10368e27d06'"'"' AND p.price > 0 LIMIT 5;"'""",
]

for cmd in cmds:
    print(f"\n{'='*60}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out: print(out.strip())
    if err and 'NOTICE' not in err and 'ERROR' in err: print('ERR:', err.strip())

client.close()
