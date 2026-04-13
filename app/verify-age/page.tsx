// app/verify-age/page.tsx
// Age verification page — shown after registration and accessible from settings.
// Users enter their date of birth. The server derives their AgeGroup
// (UNDER_13 / TEEN / ADULT) and stores it on their account.
// Under-13s and teens are blocked from MATURE-rated content.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AgeVerificationForm from './AgeVerificationForm';

export const metadata = { title: 'Verify Your Age | Silent Evidence' };

export default async function VerifyAgePage() {
  // Must be logged in
  const c      = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0) || null;
  if (!userId) redirect('/login');

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <AgeVerificationForm />
    </main>
  );
}
