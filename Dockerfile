# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:20-alpine AS deps

# Install openssl needed by Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files and install production + dev deps
COPY package.json package-lock.json* ./
RUN npm ci

# ─── Stage 2: Build the Next.js app ──────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Bring in installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of the source code
COPY . .

# Generate Prisma client (needs the schema)
RUN npx prisma generate

# Build the Next.js app
RUN npm run build

# ─── Stage 3: Production runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

# Run as a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only what is needed to run the app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema + generated client so migrations can run at startup
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy the startup script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run migrations then start the app
CMD ["./docker-entrypoint.sh"]
