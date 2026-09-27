# Used by Railway (auto-detected) and docker-compose. Vercel ignores this file.

# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:22-alpine AS deps

# Install openssl needed by Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files and install production + dev deps.
# prisma.config.ts + schema are needed because postinstall runs `prisma generate`.
COPY package.json package-lock.json* prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# ─── Stage 2: Build the Next.js app ──────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# NEXT_PUBLIC_* values are inlined into the browser bundle at BUILD time, so they
# must be available here. Railway passes service variables to matching ARGs.
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_PUSHER_KEY
ARG NEXT_PUBLIC_PUSHER_CLUSTER
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_PUSHER_KEY=$NEXT_PUBLIC_PUSHER_KEY \
    NEXT_PUBLIC_PUSHER_CLUSTER=$NEXT_PUBLIC_PUSHER_CLUSTER \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY \
    NEXT_TELEMETRY_DISABLED=1

# Bring in installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of the source code
COPY . .

# `npm run build` = prisma generate → prisma migrate deploy → next build. Several
# pages (/about, /map, sitemap, …) are prerendered from the database, so the build
# needs a DB it can reach. Railway's private network (*.railway.internal) does NOT
# exist during builds, so pass the PUBLIC connection string as BUILD_DATABASE_URL
# (Railway: BUILD_DATABASE_URL=${{MySQL.MYSQL_PUBLIC_URL}}). It is only used for
# this RUN step and is not baked into the final image.
ARG BUILD_DATABASE_URL
RUN if [ -z "$BUILD_DATABASE_URL" ]; then \
      echo "ERROR: BUILD_DATABASE_URL build arg is required (public DB URL reachable at build time)." >&2; \
      exit 1; \
    fi \
 && DATABASE_URL="$BUILD_DATABASE_URL" npm run build

# ─── Stage 3: Prisma CLI for runtime migrations ──────────────────────────────
# The standalone output only contains modules the app imports, not the Prisma
# CLI. Install the exact pinned CLI version (plus dotenv, which prisma.config.ts
# imports) so `prisma migrate deploy` works at container start.
FROM node:22-alpine AS migrator

RUN apk add --no-cache openssl

WORKDIR /migrator
COPY package.json ./
RUN PRISMA_VERSION=$(node -p "require('./package.json').devDependencies.prisma") \
 && DOTENV_VERSION=$(node -p "require('./package.json').dependencies.dotenv") \
 && echo '{}' > package.json \
 && npm install --no-audit --no-fund "prisma@$PRISMA_VERSION" "dotenv@$DOTENV_VERSION"

# ─── Stage 4: Production runtime ─────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Run as a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Prisma CLI first, then the standalone app on top (its traced node_modules,
# including the generated Prisma client, take precedence).
COPY --from=migrator /migrator/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma schema, migrations and config so migrations can run at startup
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy the startup script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Railway injects PORT at runtime; 3000 is the local/docker-compose default.
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run migrations then start the app
CMD ["./docker-entrypoint.sh"]
