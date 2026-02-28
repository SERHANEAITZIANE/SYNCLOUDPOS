#!/bin/bash
sudo -u postgres psql -c "ALTER USER syncloudpos WITH PASSWORD 'SyncloudDB_2026_Pos';"
echo "Password updated."
