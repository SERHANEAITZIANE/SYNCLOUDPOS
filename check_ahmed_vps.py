import paramiko
import json
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

def run_sql(query):
    # We will pass the query inside double quotes. 
    # To prevent bash from parsing $, `, \, we escape them, or use a simpler command.
    # A very robust way is to write the query to a temporary file on the VPS or use standard quotes.
    # Since query doesn't contain $ (except double $$ if we use that), we can write the query to a temporary SQL file.
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)
    
    # Write SQL query to /tmp/temp_query.sql
    sftp = client.open_sftp()
    f = sftp.file('/tmp/temp_query.sql', 'w')
    f.write(query)
    f.close()
    sftp.close()
    
    # Run the SQL file using -f
    cmd = "sudo -u postgres psql -d syncloudpos -t -A -f /tmp/temp_query.sql"
    stdin, stdout, stderr = client.exec_command(cmd)
    output = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    client.close()
    
    if err and "NOTICE" not in err:
        print("SQL ERR:", err)
    return output

def main():
    print("--- 1. Get user and tenant info ---")
    user_out = run_sql("SELECT id, email, \"tenantId\" FROM \"User\" WHERE email = 'salimzsec@gmail.com';")
    print("User/Tenant Output:", user_out)
    if not user_out.strip():
        print("User salimzsec@gmail.com not found!")
        return
        
    parts = user_out.strip().split('|')
    user_id = parts[0]
    tenant_id = parts[2]
    print(f"User ID: {user_id}, Tenant ID: {tenant_id}")
    
    print("\n--- 2. Find customer(s) named Ahmed ---")
    cust_query = f"SELECT id, name, balance, \"initialBalance\" FROM \"Customer\" WHERE \"tenantId\" = '{tenant_id}' AND name ILIKE '%Ahmed%';"
    cust_out = run_sql(cust_query)
    print("Customer Output:\n", cust_out)
    
    if not cust_out.strip():
        print("No customer matching Ahmed found!")
        # Let's list all customers to see who exists
        print("\n--- Listing first 10 customers: ---")
        all_custs = run_sql(f"SELECT id, name, balance FROM \"Customer\" WHERE \"tenantId\" = '{tenant_id}' LIMIT 10;")
        print(all_custs)
        return
        
    cust_lines = [line.strip().split('|') for line in cust_out.strip().split('\n') if line.strip()]
    for c in cust_lines:
        cid, name, bal, init_bal = c[0], c[1], c[2], c[3]
        print(f"\n==========================================")
        print(f"Customer Name: {name} (ID: {cid})")
        print(f"Current Balance: {bal}, Initial Balance: {init_bal}")
        
        # Get Sales Orders for this customer
        print("\n--- Sales Orders (Bons de Livraison, Factures, etc.) ---")
        so_query = f"""
            SELECT id, type, status, "receiptNumber", total, "amountPaid", "createdAt"
            FROM "SalesOrder"
            WHERE "customerId" = '{cid}'
            ORDER BY "createdAt" ASC;
        """
        so_out = run_sql(so_query)
        print("Type | Status | ReceiptNumber | Total | AmountPaid | CreatedAt")
        print(so_out)
        
        # Get payments or treasury transactions involving this customer or their orders
        print("\n--- Treasury Transactions for this Customer / sales orders ---")
        tt_query = f"""
            SELECT id, type, amount, source, "referenceId", description, date
            FROM "TreasuryTransaction"
            WHERE "tenantId" = '{tenant_id}'
              AND (
                "referenceId" = '{cid}'
                OR "referenceId" IN (SELECT id FROM "SalesOrder" WHERE "customerId" = '{cid}')
                OR description ILIKE '%{name}%'
              )
            ORDER BY date ASC;
        """
        tt_out = run_sql(tt_query)
        print("ID | Type | Amount | Source | ReferenceId | Description | Date")
        print(tt_out)

if __name__ == '__main__':
    main()
