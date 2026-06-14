import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('155.133.26.217', 22, 'root', 'pkn567ftXW3L')

query = 'SELECT id, "tenantId", "customerId", "status", "receiptNumber", "total", "amountPaid" FROM "SalesOrder" WHERE "receiptNumber" IN ($$BL-2026/0001$$, $$BL-2026/0002$$);'
prompt = f"sudo -u postgres psql -d syncloudpos -x -c '{query}'"

stdin, stdout, stderr = client.exec_command(prompt)
print(stdout.read().decode())

err = stderr.read().decode()
if err:
    print("Errors:", err)

client.close()
