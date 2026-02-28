#!/bin/bash
sed -i 's/127.0.0.1\/32            md5/127.0.0.1\/32            trust/g' /etc/postgresql/14/main/pg_hba.conf
sed -i 's/127.0.0.1\/32            scram-sha-256/127.0.0.1\/32            trust/g' /etc/postgresql/14/main/pg_hba.conf
sed -i 's/::1\/128                 md5/::1\/128                 trust/g' /etc/postgresql/14/main/pg_hba.conf
sed -i 's/::1\/128                 scram-sha-256/::1\/128                 trust/g' /etc/postgresql/14/main/pg_hba.conf
systemctl restart postgresql
echo "Localhost auth set to trust."
