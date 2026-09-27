// lib/apiError.ts
// Centralized API error helpers — use these in every route handler so all
// error responses have a consistent shape: { error: string }.
// This makes it easy for the frontend to handle errors the same way everywhere.

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// ── Standard error responses ──────────────────────────────────────────────────

/** 400 Bad Request — invalid or missing input */
export const badRequest = (message = 'Bad request') =>
  NextResponse.json({ error: message }, { status: 400 });

/** 401 Unauthorized — not logged in */
export const unauthorized = (message = 'You must be logged in.') =>
  NextResponse.json({ error: message }, { status: 401 });

/** 403 Forbidden — logged in but not allowed */
export const forbidden = (message = 'You do not have permission to do that.') =>
  NextResponse.json({ error: message }, { status: 403 });

/** 404 Not Found */
export const notFound = (message = 'Not found.') =>
  NextResponse.json({ error: message }, { status: 404 });

/** 409 Conflict — e.g. duplicate username/email */
export const conflict = (message = 'Conflict.') =>
  NextResponse.json({ error: message }, { status: 409 });

/** 429 Too Many Requests — rate limit hit */
export const tooManyRequests = (message = 'Too many requests. Please try again later.') =>
  NextResponse.json({ error: message }, { status: 429 });

/** 500 Internal Server Error — unexpected failures */
export const serverError = (message = 'Something went wrong. Please try again.') =>
  NextResponse.json({ error: message }, { status: 500 });

// ── Zod validation helper ─────────────────────────────────────────────────────

/**
 * zodError — converts a ZodError into a friendly 400 response.
 * Returns the first validation message (e.g. "Email is required").
 *
 * Usage:
 *   const parsed = LoginSchema.safeParse(body);
 *   if (!parsed.success) return zodError(parsed.error);
 */
export const zodError = (err: ZodError) => {
  // Pick the first issue's message — keeps the response simple for the UI
  const message = err.issues[0]?.message ?? 'Validation failed.';
  return NextResponse.json({ error: message }, { status: 400 });
};

// ── Async route wrapper ───────────────────────────────────────────────────────

/**
 * withErrorHandling — wraps a route handler so any uncaught error
 * returns a 500 instead of crashing the server with an unhandled rejection.
 *
 * Usage:
 *   export const POST = withErrorHandling(async (req) => {
 *     // your handler logic
 *   });
 */
export function withErrorHandling(handler: (req: Request, ctx?: unknown) => Promise<NextResponse>) {
  return async (req: Request, ctx?: unknown): Promise<NextResponse> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      // Log the full error server-side for debugging
      console.error('[API Error]', err);
      return serverError();
    }
  };
}
