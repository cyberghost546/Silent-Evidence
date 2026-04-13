#!/bin/sh
set -e

# Run Prisma migrations before starting the app.
# This makes sure the database schema is always up to date on container start.
echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting Next.js..."
exec node server.js
