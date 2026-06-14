import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('155.133.26.217', 22, 'root', 'pkn567ftXW3L')

order_ids = ("'fc2836a0-0917-4e80-9a3d-dc16f00d447b'", "'e215d5b8-07b6-45d4-bcbe-8e42f68d8241'")

tables = [
    ("SalesOrderItem", "salesOrderId"),
    ("TreasuryTransaction", "referenceId"),
    ("StockMovement", "referenceId"),
    ("ProductReturn", "salesOrderId"),
    ("DeliveryShipment", "salesOrderId")
]

for table, col in tables:
    query = f'SELECT id FROM "{table}" WHERE "{col}" IN ({", ".join(order_ids)});'
    prompt = f"sudo -u postgres psql -d syncloudpos -c '{query}'"
    stdin, stdout, stderr = client.exec_command(prompt)
    print(f"--- Relations in {table} ---")
    print(stdout.read().decode())

client.close()
