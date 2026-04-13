// app/api/user/age/route.ts
// PATCH — saves the user's date of birth and derives their age group.
// Called from the age verification page after registration or from settings.
// Returns the resolved ageGroup so the client can update its UI immediately.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { unauthorized, zodError, serverError } from '@/lib/apiError';

// Helper: calculate age in full years from a Date
function calcAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

// Derive AgeGroup enum from age in years
function toAgeGroup(age: number): 'UNDER_13' | 'TEEN' | 'ADULT' {
  if (age < 13)  return 'UNDER_13';
  if (age < 18)  return 'TEEN';
  return 'ADULT';
}

// Expect a date string like "2005-06-15"
const Schema = z.object({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
});

export async function PATCH(req: Request) {
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0) || null;
  if (!userId) return unauthorized();

  try {
    const body   = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const dob      = new Date(parsed.data.dateOfBirth + 'T12:00:00Z');
    const age      = calcAge(dob);
    const ageGroup = toAgeGroup(age);

    // Reject obviously fake dates (born before 1900 or future dates)
    const year = dob.getFullYear();
    if (year < 1900 || dob > new Date()) {
      return NextResponse.json({ error: 'Invalid date of birth.' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data:  { dateOfBirth: dob, ageGroup },
    });

    return NextResponse.json({ ageGroup, age });
  } catch (err) {
    console.error('[user age PATCH]', err);
    return serverError();
  }
}
