import subprocess, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    import paramiko
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "paramiko", "-q"], check=True)
    import paramiko

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port, username, password, timeout=15)
print("Connected!\n")

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        print(out)
    if err and 'NOTICE' not in err and 'could not change' not in err:
        print(f"[stderr] {err[:500]}")
    return out

DB = 'PGPASSWORD=SyncloudDB_2026_Pos psql -U syncloudpos -h 127.0.0.1 -p 5433 -d syncloudpos'

print("=== 1. Why are 78 products still missing? Check if they have a tenant without a store ===")
run(f"""{DB} -c "SELECT p.\\"tenantId\\", COUNT(*) AS orphaned_products FROM \\"Product\\" p LEFT JOIN \\"StoreProduct\\" sp ON sp.\\"productId\\" = p.id WHERE sp.id IS NULL GROUP BY p.\\"tenantId\\";" """)

print("\n=== 2. Check which tenants have stores ===")
run(f"""{DB} -c "SELECT t.id AS tenant_id, t.name, (SELECT COUNT(*) FROM \\"Store\\" s WHERE s.\\"tenantId\\" = t.id) AS store_count FROM \\"Tenant\\" t;" """)

print("\n=== 3. Products with stock > 0 in Product table ===")
run(f"""{DB} -c "SELECT name, stock FROM \\"Product\\" WHERE stock > 0 ORDER BY stock DESC LIMIT 20;" """)

print("\n=== 4. Total products where stock > 0 in Product table ===")
run(f"""{DB} -c "SELECT COUNT(*) FROM \\"Product\\" WHERE stock > 0;" """)

print("\n=== 5. Products with stock > 0 in StoreProduct table ===")
run(f"""{DB} -c "SELECT p.name, sp.stock FROM \\"StoreProduct\\" sp JOIN \\"Product\\" p ON p.id = sp.\\"productId\\" WHERE sp.stock > 0 ORDER BY sp.stock DESC LIMIT 20;" """)

print("\n=== 6. For the orphaned products, create stores for tenants that have none ===")
# Check tenants without stores
run(f"""{DB} -c "SELECT t.id, t.name FROM \\"Tenant\\" t WHERE NOT EXISTS (SELECT 1 FROM \\"Store\\" s WHERE s.\\"tenantId\\" = t.id);" """)

client.close()
print("\nDone.")
