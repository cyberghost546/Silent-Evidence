// app/admin/challenges/new/page.tsx
// Admin form to create a new story challenge.

import NewChallengeForm from '@/app/components/ui/NewChallengeForm';

export const metadata = { title: 'New Challenge — Admin' };

export default function NewChallengePage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">New Challenge</h1>
        <p className="text-sm text-gray-500 mt-1">Create a writing challenge for your community.</p>
      </div>
      <NewChallengeForm />
    </div>
  );
}
