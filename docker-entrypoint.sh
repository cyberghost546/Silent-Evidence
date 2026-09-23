#!/bin/sh
set -e

# Run Prisma migrations before starting the app.
# This makes sure the database schema is always up to date on container start.
# Uses the locally installed CLI (see Dockerfile "migrator" stage) — never let
# npx download a different Prisma version at runtime.
echo "Running Prisma migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "Starting Next.js..."
exec node server.js
