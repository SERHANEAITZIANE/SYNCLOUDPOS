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

sql_script = r"""
-- Step 1: Create stores for tenants that don't have any
INSERT INTO "Store" (id, name, "tenantId", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    'Boutique Principale',
    t.id,
    NOW(),
    NOW()
FROM "Tenant" t
WHERE NOT EXISTS (SELECT 1 FROM "Store" s WHERE s."tenantId" = t.id);

-- Step 2: Create StoreProduct entries for ALL remaining products
INSERT INTO "StoreProduct" (id, "storeId", "productId", stock, "minStock", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    s.id,
    p.id,
    p.stock,
    p."minStock",
    NOW(),
    NOW()
FROM "Product" p
JOIN "Store" s ON s."tenantId" = p."tenantId"
LEFT JOIN "StoreProduct" sp ON sp."productId" = p.id AND sp."storeId" = s.id
WHERE sp.id IS NULL;

-- Step 3: Sync ALL StoreProduct.stock with Product.stock (Product.stock is the source of truth)
UPDATE "StoreProduct" sp
SET stock = p.stock, "updatedAt" = NOW()
FROM "Product" p
WHERE sp."productId" = p.id
AND sp.stock != p.stock;
"""

sftp = client.open_sftp()
with sftp.open('/tmp/fix_stock_final.sql', 'w') as f:
    f.write(sql_script)
sftp.close()

print("=== Running final fix ===")
run('PGPASSWORD=SyncloudDB_2026_Pos psql -U syncloudpos -h 127.0.0.1 -p 5433 -d syncloudpos -f /tmp/fix_stock_final.sql')

print("\n=== VERIFICATION ===")
print("\nProducts still missing StoreProduct (should be 0):")
run('PGPASSWORD=SyncloudDB_2026_Pos psql -U syncloudpos -h 127.0.0.1 -p 5433 -d syncloudpos -c "SELECT COUNT(*) AS missing FROM \\"Product\\" p LEFT JOIN \\"StoreProduct\\" sp ON sp.\\"productId\\" = p.id WHERE sp.id IS NULL;"')

print("\nTotal StoreProduct entries:")
run('PGPASSWORD=SyncloudDB_2026_Pos psql -U syncloudpos -h 127.0.0.1 -p 5433 -d syncloudpos -c "SELECT COUNT(*) FROM \\"StoreProduct\\";"')

print("\nProducts with stock > 0 in StoreProduct:")
run('PGPASSWORD=SyncloudDB_2026_Pos psql -U syncloudpos -h 127.0.0.1 -p 5433 -d syncloudpos -c "SELECT p.name, sp.stock FROM \\"StoreProduct\\" sp JOIN \\"Product\\" p ON p.id = sp.\\"productId\\" WHERE sp.stock > 0 ORDER BY sp.stock DESC LIMIT 20;"')

print("\nMismatches remaining (should be 0):")
run('PGPASSWORD=SyncloudDB_2026_Pos psql -U syncloudpos -h 127.0.0.1 -p 5433 -d syncloudpos -c "SELECT COUNT(*) FROM \\"Product\\" p JOIN \\"StoreProduct\\" sp ON sp.\\"productId\\" = p.id WHERE p.stock != sp.stock;"')

# Clear Redis + restart
print("\n=== Clearing Redis + restarting PM2 ===")
run("redis-cli FLUSHDB")
run("pm2 restart syncloudpos")

run("rm /tmp/fix_stock_final.sql")
client.close()
print("\nAll done!")
