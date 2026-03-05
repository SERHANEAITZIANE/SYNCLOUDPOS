#!/bin/sh
set -e

echo "⏳ Waiting for database..."
until pg_isready -h db -U syncloud -d syncloudpos 2>/dev/null; do
  sleep 1
done
echo "✅ Database is ready"

echo "🔄 Running database migrations..."
npx prisma db push --skip-generate
echo "✅ Migrations complete"

echo "🚀 Starting SYNCLOUDPOS..."
exec node server.js
