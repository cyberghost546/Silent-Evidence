// ============================================================
//  app/api/messages/conversations/route.ts
//
//  GET /api/messages/conversations
//
//  Returns a summarised list of all conversations the logged-in
//  user has participated in — used to render the inbox sidebar.
//
//  For each unique conversation partner the response includes:
//    - partner:      { id, username, profile.avatar }
//    - lastMessage:  preview text (truncated at 60 chars)
//    - lastAt:       timestamp of the most recent message
//    - unread:       count of messages from that partner not yet read
//
//  How it works:
//    1. Fetch ALL messages involving this user (sent or received)
//       ordered by newest first.
//    2. Loop through them keeping only the FIRST message per partner
//       (that's the most recent because of the sort order).
//    3. Count how many of that partner's messages are still unread.
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client for all DB queries
import { prisma } from '@/lib/prisma';

// ── GET handler ───────────────────────────────────────────────────────────────
// Returns a deduplicated list of conversations with the latest message preview.
export async function GET() {
  // Read all cookies from the request
  const cookieStore = await cookies();

  // Extract the logged-in user's ID from the session cookie
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Must be logged in to view conversations
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Fetch every message sent to or received from this user.
  // OR means: messages where I am the sender OR I am the receiver.
  // We order by createdAt desc so the most recent message per conversation
  // appears first when we loop through the results below.
  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        // Messages the logged-in user sent
        { senderId: userId },
        // Messages the logged-in user received
        { receiverId: userId },
      ],
    },
    // Newest messages first — important for deduplication logic below
    orderBy: { createdAt: 'desc' },
    select: {
      // Message metadata
      id: true,
      content: true,
      createdAt: true,
      // Used to determine if this message is unread for the badge count
      read: true,
      // Needed to determine which side of the conversation each user is on
      senderId: true,
      receiverId: true,
      // Full sender profile for displaying the partner's info
      sender: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
      // Full receiver profile — we need both because either could be the "partner"
      receiver: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
    },
  });

  // Set to track which partners we have already processed.
  // Once we have the most recent message for a partner, we skip their older messages.
  const seen = new Set<number>();

  // The accumulated list of conversation summaries we'll return to the client
  const conversations: {
    partner: { id: number; username: string; profile: { avatar: string | null } | null };
    lastMessage: string;
    lastAt: string;
    unread: number;
  }[] = [];

  // Loop through all messages (newest first) to build one entry per conversation partner
  for (const msg of messages) {
    // Determine which user is the "partner" in this message.
    // If I am the sender, the partner is the receiver (the other person).
    // If I am the receiver, the partner is the sender (the other person).
    const partner = msg.senderId === userId ? msg.receiver : msg.sender;

    // Skip this message if we have already recorded the most recent message for this partner.
    // Because messages are sorted newest-first, the first message we see per partner is the latest.
    if (seen.has(partner.id)) continue;

    // Mark this partner as processed so subsequent (older) messages from them are skipped
    seen.add(partner.id);

    // Count unread messages from this specific partner.
    // We filter the already-fetched messages array instead of making another DB call.
    // Criteria: sent BY the partner, addressed TO me, and not yet marked as read.
    const unread = messages.filter(
      (m) => m.senderId === partner.id && m.receiverId === userId && !m.read
    ).length;

    // Push the conversation summary into our result list
    conversations.push({
      // The other user's profile info
      partner,
      // Preview text capped at 60 characters to fit the sidebar card.
      // If longer, the text is truncated and an ellipsis is appended.
      lastMessage: msg.content.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content,
      // Timestamp of the most recent message — used to sort conversations in the sidebar
      lastAt: msg.createdAt.toString(),
      // How many unread messages are from this partner — drives the red badge number
      unread,
    });
  }

  // Return the deduplicated, summarised list of conversations
  return NextResponse.json(conversations);
}
