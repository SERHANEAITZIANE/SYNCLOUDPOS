import subprocess, sys

try:
    import psycopg2
    import bcrypt
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "psycopg2-binary", "bcrypt", "-q"], check=True)
    import psycopg2
    import bcrypt

import uuid
from datetime import datetime, timedelta

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    dbname='syncloudpos',
    user='admin',
    password='admin123',
    connect_timeout=10
)
cur = conn.cursor()

# Check if admin user already exists
cur.execute('SELECT id, email FROM "User" WHERE email = %s', ('admin@syncloud.dz',))
existing = cur.fetchone()
if existing:
    print(f"Admin user already exists: {existing[1]}")
    conn.close()
    sys.exit(0)

# Generate IDs
tenant_id = str(uuid.uuid4())
store_id = str(uuid.uuid4())
user_id = str(uuid.uuid4())
treasury_id1 = str(uuid.uuid4())
treasury_id2 = str(uuid.uuid4())
treasury_id3 = str(uuid.uuid4())
customer_id = str(uuid.uuid4())

# Trial end = 30 days from now
trial_end = datetime.now() + timedelta(days=30)

# Hash password
password = "Admin@123"
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

print(f"Creating tenant: {tenant_id}")
cur.execute('''
    INSERT INTO "Tenant" (id, name, "subscriptionEndsAt", "createdAt", "updatedAt")
    VALUES (%s, %s, %s, NOW(), NOW())
''', (tenant_id, 'SyncCloud Demo', trial_end))

print(f"Creating store: {store_id}")
cur.execute('''
    INSERT INTO "Store" (id, "tenantId", name, "createdAt", "updatedAt")
    VALUES (%s, %s, %s, NOW(), NOW())
''', (store_id, tenant_id, 'Boutique Principale'))

print(f"Creating admin user: {user_id}")
cur.execute('''
    INSERT INTO "User" (id, email, name, password, role, "tenantId", "defaultStoreId", "isSuperadmin", "canEdit", "canDelete", "createdAt", "updatedAt")
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
''', (user_id, 'admin@syncloud.dz', 'Admin', hashed, 'ADMIN', tenant_id, store_id, False, True, True))

print("Creating treasury accounts...")
cur.execute('''
    INSERT INTO "TreasuryAccount" (id, name, type, balance, "tenantId", "createdAt", "updatedAt")
    VALUES
        (%s, 'CAISSE PRINCIPALE', 'CAISSE', 0, %s, NOW(), NOW()),
        (%s, 'CAISSE SECONDAIRE', 'CAISSE', 0, %s, NOW(), NOW()),
        (%s, 'TPE', 'BANK', 0, %s, NOW(), NOW())
''', (treasury_id1, tenant_id, treasury_id2, tenant_id, treasury_id3, tenant_id))

print("Creating default DIVERS customer...")
cur.execute('''
    INSERT INTO "Customer" (id, name, "clientType", balance, "loyaltyPoints", "tenantId", "createdAt", "updatedAt")
    VALUES (%s, 'DIVERS', 'RETAIL', 0, 0, %s, NOW(), NOW())
''', (customer_id, tenant_id))

conn.commit()
cur.close()
conn.close()

print("\n✅ Seeding complete!")
print(f"   Email:    admin@syncloud.dz")
print(f"   Password: Admin@123")
print(f"   Tenant:   SyncCloud Demo")
