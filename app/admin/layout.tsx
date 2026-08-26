// app/admin/layout.tsx
//
// This is the SHARED LAYOUT for every page under /admin.
// In Next.js App Router, a `layout.tsx` file wraps every page in its folder
// and all nested folders. That means this file renders once and every admin
// page is injected into it via the `{children}` prop — the sidebar and the
// auth check happen automatically for every admin route.
//
// WHY put the auth check here (not in each individual page)?
//   Centralising it here means a single location enforces the ADMIN role for
//   ALL admin pages. You only have to maintain one auth check. If you relied on
//   individual pages to self-protect, it's easy to forget one and leave a
//   security gap.
//
// HOW THE AUTH FLOW WORKS:
//   1. Read the `userId` cookie that was set at login.
//   2. If no cookie → redirect to /login (user is not logged in at all).
//   3. Look up the user's role in the database.
//   4. If user doesn't exist or isn't ADMIN → redirect to / (home).
//   5. Only if role === 'ADMIN' does the layout render the sidebar + page.
//
// HOW THE LAYOUT IS STRUCTURED:
//   The outer flex container puts the sidebar and the main content area side by side.
//   `ml-0 md:ml-64` shifts the main area right on desktop to make room for the
//   fixed-width 64-unit sidebar. On mobile (ml-0) the sidebar overlays or collapses.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AdminSidebar from '@/app/components/ui/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // `cookies()` is a Next.js server function that reads the request's Cookie header.
  // We await it because in Next.js 14 it returns a Promise.
  const cookieStore = await cookies();

  // Parse the userId cookie as a number. `?? 0` handles the case where the
  // cookie doesn't exist — Number(undefined) is NaN, which is truthy, so we
  // explicitly fall back to 0 (which is falsy and fails the !userId check below).
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // No valid cookie → not logged in → send to login page
  if (!userId) redirect('/login');

  // Look up the user's role — we only need `username` (for the sidebar greeting)
  // and `role` (for the access check). Selecting only what we need keeps the
  // query lightweight.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, role: true, twoFactorEnabled: true },
  });

  // Covers two cases:
  //   • `user` is null  → the cookie references a deleted account → redirect home
  //   • role !== 'ADMIN' → logged in but not an admin → redirect home
  if (!user || user.role !== 'ADMIN') redirect('/');

  // ── Require 2FA for admins ─────────────────────────────────────────────────
  // Admin accounts are the highest-value target on the site, so an admin whose
  // password is phished should not be enough to take over. We block the admin
  // area until 2FA is enabled, rather than redirecting (which could loop), and
  // link straight to the setting. The env escape hatch exists because 2FA here
  // is delivered by email — if email is not configured yet, forcing it would
  // lock every admin out; set REQUIRE_ADMIN_2FA=false only in that case.
  const require2fa = process.env.REQUIRE_ADMIN_2FA !== 'false';
  if (require2fa && !user.twoFactorEnabled) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 border border-red-900/40 rounded-2xl p-6 text-center">
          <h1 className="text-xl font-bold text-white mb-2">Two-factor authentication required</h1>
          <p className="text-sm text-gray-400 mb-5">
            Admin accounts must have two-factor authentication enabled. Turn it on in
            your account settings, then return here. You&apos;ll also receive backup
            recovery codes so you can never be locked out.
          </p>
          <a
            href="/settings"
            className="inline-block px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            Go to settings
          </a>
        </div>
      </div>
    );
  }

  // ── Render the admin shell ────────────────────────────────────────────────
  // The layout renders the sidebar once, shared across all admin pages.
  // `{children}` is replaced by whichever /admin/*/page.tsx the user navigated to.
  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Fixed sidebar — receives the username to display in the header area */}
      <AdminSidebar username={user.username} />
      {/*
        Main content area.
        ml-0 md:ml-64  — on mobile the sidebar is hidden/overlaid, no margin needed;
                         on desktop (md+) push the content 64 units right to clear the sidebar.
        pt-16 md:pt-8  — on mobile add extra top padding for the mobile hamburger/header;
                         on desktop the sidebar header is off to the side so less top padding.
      */}
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pt-16 md:pt-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
