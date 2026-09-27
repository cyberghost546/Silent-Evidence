// lib/prisma.ts
// Sets up the Prisma database client used throughout the app.
// Prisma is the tool that lets us talk to the MariaDB database using TypeScript
// instead of writing raw SQL — e.g. prisma.user.findUnique(...) instead of SELECT * FROM users.
//
// The DATABASE_URL env variable must be set in .env — it's the full connection string
// to your MariaDB database (e.g. mysql://user:password@localhost:3306/silent_evidence).

import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

// parseDbUrl — breaks the DATABASE_URL connection string into the individual
// fields that the MariaDB adapter needs (host, port, user, password, database name).
// Using a URL string in .env is cleaner than having 5 separate env vars.
function parseDbUrl() {
  const url = new URL(process.env.DATABASE_URL!);
  return {
    host: url.hostname,
    port: parseInt(url.port) || 3306, // Default MariaDB/MySQL port is 3306
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1), // Remove the leading "/" from the path
  };
}

// Next.js runs in "hot reload" mode during development, which means the server
// code can be re-evaluated many times. Without this trick, each reload would
// create a new database connection pool and eventually exhaust the DB's connection limit.
// The fix: attach the Prisma instance to the Node.js global object so it survives reloads.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Re-use the existing instance if it exists (development), or create a new one (production/first load)
export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaMariaDb(parseDbUrl()) });

// Only cache on global in development — production always creates one instance at cold start
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
