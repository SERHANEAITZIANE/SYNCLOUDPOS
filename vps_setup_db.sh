#!/bin/bash
sudo -u postgres psql -c "CREATE USER syncloudpos WITH PASSWORD 'SyncloudDB_2026!*';"
sudo -u postgres psql -c "CREATE DATABASE syncloudpos_db OWNER syncloudpos;"
sudo -u postgres psql -c "ALTER USER syncloudpos CREATEDB;"
echo "Database created successfully"
