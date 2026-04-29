import subprocess, sys

# Install psycopg2 if not present
try:
    import psycopg2
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"], check=True)
    import psycopg2

try:
    conn = psycopg2.connect(
        host='155.133.26.217',
        port=5432,
        dbname='syncloudpos',
        user='admin',
        password='admin123',
        connect_timeout=10
    )
    cur = conn.cursor()
    cur.execute('SELECT COUNT(*) FROM public."User"')
    print('Users count:', cur.fetchone()[0])
    cur.execute('SELECT email FROM public."User" LIMIT 5')
    for row in cur.fetchall():
        print('User email:', row[0])
    conn.close()
    print('DB connection: OK')
except Exception as e:
    print('DB error:', type(e).__name__, str(e))
