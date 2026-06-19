import psycopg2

try:
    conn = psycopg2.connect("postgresql://postgres:postgres@155.133.26.217:5432/syncloudpos")
    cur = conn.cursor()
    cur.execute("""
        SELECT o.id, o."createdAt", p.name, p.cost
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        LEFT JOIN "Product" p ON p.id = oi."productId"
        ORDER BY o."createdAt" DESC
        LIMIT 5;
    """)
    for row in cur.fetchall():
        print(row)
    cur.close()
    conn.close()
except Exception as e:
    print(e)
