import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('155.133.26.217', 22, 'root', 'pkn567ftXW3L')

order_ids = ["fc2836a0-0917-4e80-9a3d-dc16f00d447b", "e215d5b8-07b6-45d4-bcbe-8e42f68d8241"]

# 1. Select query to verify they are still there
verify_query = 'SELECT id, "receiptNumber", "tenantId", status FROM "SalesOrder" WHERE id IN ($$fc2836a0-0917-4e80-9a3d-dc16f00d447b$$, $$e215d5b8-07b6-45d4-bcbe-8e42f68d8241$$);'
stdin, stdout, stderr = client.exec_command(f"sudo -u postgres psql -d syncloudpos -c '{verify_query}'")
print("Before deletion:")
print(stdout.read().decode())

# 2. Delete query
delete_query = 'DELETE FROM "SalesOrder" WHERE id IN ($$fc2836a0-0917-4e80-9a3d-dc16f00d447b$$, $$e215d5b8-07b6-45d4-bcbe-8e42f68d8241$$);'
stdin, stdout, stderr = client.exec_command(f"sudo -u postgres psql -d syncloudpos -c '{delete_query}'")
print("Deletion result:")
print(stdout.read().decode())

# 3. Select query to verify they are gone
stdin, stdout, stderr = client.exec_command(f"sudo -u postgres psql -d syncloudpos -c '{verify_query}'")
print("After deletion:")
print(stdout.read().decode())

client.close()
