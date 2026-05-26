import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('155.133.26.217', 22, 'root', 'C4r3vL[N7~_ulO%^')

# Write SQL file to server and execute it
backfill_sql = '''
-- Backfill missing StoreProduct records
INSERT INTO "StoreProduct" (id, "storeId", "productId", stock, "minStock")
SELECT
    gen_random_uuid(),
    s.id,
    p.id,
    COALESCE(p.stock, 0),
    COALESCE(p."minStock", 0)
FROM "Product" p
JOIN "Store" s ON s."tenantId" = p."tenantId"
WHERE NOT EXISTS (
    SELECT 1 FROM "StoreProduct" sp
    WHERE sp."productId" = p.id AND sp."storeId" = s.id
);

-- Fix all users with NULL defaultStoreId
UPDATE "User" u
SET "defaultStoreId" = sub.store_id
FROM (
    SELECT u2.id as user_id, (
        SELECT s.id FROM "Store" s
        WHERE s."tenantId" = u2."tenantId"
        ORDER BY s."createdAt" ASC
        LIMIT 1
    ) as store_id
    FROM "User" u2
    WHERE u2."defaultStoreId" IS NULL
    AND u2."tenantId" IS NOT NULL
) sub
WHERE u.id = sub.user_id AND sub.store_id IS NOT NULL;
'''

# Write SQL to server
sftp = client.open_sftp()
with sftp.file('/tmp/backfill.sql', 'w') as f:
    f.write(backfill_sql)
sftp.close()

# Execute SQL
print("Running backfill SQL...")
stdin, stdout, stderr = client.exec_command(
    'su - postgres -c "psql -d syncloudpos -f /tmp/backfill.sql"',
    timeout=30
)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print("STDOUT:", out)
if err: print("STDERR:", err)

# Verify
print("\nVerifying...")
stdin, stdout, stderr = client.exec_command(
    '''su - postgres -c 'psql -d syncloudpos -c "SELECT COUNT(*) as total_store_products FROM \\"StoreProduct\\";"' ''',
    timeout=10
)
print(stdout.read().decode('utf-8', errors='replace'))

client.close()
print("\n✅ Database backfill complete!")
