#!/bin/bash
sed -i 's/scram-sha-256/md5/g' /etc/postgresql/14/main/pg_hba.conf
systemctl restart postgresql
echo "pg_hba updated to md5 and restarted."
