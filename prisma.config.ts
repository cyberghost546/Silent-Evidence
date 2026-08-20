import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
  // The datasource URL is only needed by commands that actually touch the
  // database (migrate, db push, db seed, studio) — `prisma generate` does not
  // need it. `env()` throws if the variable is missing, so only declare the
  // datasource when DATABASE_URL is set. This keeps `npm install` (which runs
  // `prisma generate` via postinstall) working on a fresh clone or in a Docker
  // build stage where no .env exists yet.
  ...(process.env.DATABASE_URL
    ? { datasource: { url: env("DATABASE_URL") } }
    : {}),
});
