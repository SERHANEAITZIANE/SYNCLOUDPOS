import paramiko
import json
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

def run_sql(query):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)
    
    sftp = client.open_sftp()
    f = sftp.file('/tmp/temp_query.sql', 'w')
    f.write(query)
    f.close()
    sftp.close()
    
    cmd = "sudo -u postgres psql -d syncloudpos -t -A -f /tmp/temp_query.sql"
    stdin, stdout, stderr = client.exec_command(cmd)
    output = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    client.close()
    
    if err and "NOTICE" not in err:
        print("SQL ERR:", err)
    return output

def main():
    tenant_id = '736b488d-5eff-49e1-83c5-472f2185d26c'
    out_lines = []
    
    out_lines.append("=== 1. SEARCH FOR 'AUTRE' IN ALL TABLES ===")
    # Let's search in Customer, SalesOrder, TreasuryTransaction, StockMovement
    for table in ["Customer", "SalesOrder", "TreasuryTransaction", "StockMovement", "Product"]:
        # Find column names for this table
        cols_query = f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}';"
        cols = run_sql(cols_query).strip().split('\n')
        cols = [c.strip() for c in cols if c.strip()]
        
        # Build query to search for 'autre' in any text column
        conditions = []
        for col in cols:
            conditions.append(f"\"{col}\"::text ILIKE '%autre%'")
        
        if conditions:
            search_query = f"SELECT * FROM \"{table}\" WHERE \"tenantId\" = '{tenant_id}' AND ({' OR '.join(conditions)}) LIMIT 20;"
            res = run_sql(search_query)
            out_lines.append(f"\n--- Table {table} search results for 'autre': ---")
            out_lines.append(res)
            
    out_lines.append("\n=== 2. DISTINCT TRANSACTION SOURCES ===")
    sources_query = f"""
        SELECT source, count(*), sum(amount)
        FROM "TreasuryTransaction"
        WHERE "tenantId" = '{tenant_id}'
        GROUP BY source;
    """
    out_lines.append(run_sql(sources_query))
    
    out_lines.append("\n=== 3. TREASURY TRANSACTIONS FOR AHMED (ID: 419b3284-0015-4195-af35-e5342bc19689) ===")
    ahmed_query = f"""
        SELECT id, type, amount, source, "referenceId", description, date
        FROM "TreasuryTransaction"
        WHERE "tenantId" = '{tenant_id}'
          AND (
            "referenceId" = '419b3284-0015-4195-af35-e5342bc19689'
            OR description ILIKE '%ahmed%'
          )
        ORDER BY date ASC;
    """
    out_lines.append(run_sql(ahmed_query))

    with open('local_search_out.txt', 'w', encoding='utf-8') as f:
        f.write("\n".join(out_lines))
    print("Done! Output written to local_search_out.txt")

if __name__ == '__main__':
    main()
