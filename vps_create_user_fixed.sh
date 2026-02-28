#!/bin/bash
sudo -u postgres psql -c "CREATE USER syncloudpos WITH PASSWORD 'SyncloudDB_2026_Pos';" 2>/dev/null
sudo -u postgres psql -c "ALTER USER syncloudpos WITH PASSWORD 'SyncloudDB_2026_Pos';"
sudo -u postgres psql -c "ALTER USER syncloudpos CREATEDB;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE syncloudpos_db TO syncloudpos;"
echo "User syncloudpos is now properly configured."
