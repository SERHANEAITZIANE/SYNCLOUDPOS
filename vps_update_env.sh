#!/bin/bash
sed -i 's|DATABASE_URL=.*|DATABASE_URL="postgresql://admin:admin123@127.0.0.1:5432/syncloudpos?schema=public"|' /var/www/syncloudpos/.env
echo "Production .env updated."
