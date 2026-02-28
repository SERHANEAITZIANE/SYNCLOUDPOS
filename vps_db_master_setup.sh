#!/bin/bash
sudo -u postgres psql -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'syncloudpos') THEN CREATE ROLE syncloudpos LOGIN PASSWORD 'SyncloudDB_2026_Pos'; END IF; END \$\$;"
sudo -u postgres psql -c "ALTER ROLE syncloudpos WITH PASSWORD 'SyncloudDB_2026_Pos';"
sudo -u postgres psql -c "ALTER ROLE syncloudpos CREATEDB;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE syncloudpos_db TO syncloudpos;"
sudo -u postgres psql -c "ALTER DATABASE syncloudpos_db OWNER TO syncloudpos;"
echo "syncloudpos role and DB are ready!"
