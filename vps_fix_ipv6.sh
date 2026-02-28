#!/bin/bash
sed -i 's/::1\/128                 scram-sha-256/::1\/128                 md5/g' /etc/postgresql/14/main/pg_hba.conf
systemctl restart postgresql
echo "IPv6 localhost auth updated to md5."
