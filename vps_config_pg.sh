#!/bin/bash
# Enable remote connections in postgresql.conf
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/14/main/postgresql.conf

# Allow password authentication from any IP in pg_hba.conf
echo "host    all             all             0.0.0.0/0               md5" >> /etc/postgresql/14/main/pg_hba.conf

# Restart PostgreSQL service
systemctl restart postgresql
echo "PostgreSQL configured for remote access and restarted."
