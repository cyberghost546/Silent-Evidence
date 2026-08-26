// lib/moderation.ts
//
// Records moderation decisions with the "statement of reasons" the EU Digital
// Services Act requires (Art. 17), and notifies the affected user so they know a
// decision was made and how to challenge it.
//
// Any code that removes content, rejects it at publish time, warns, suspends, or
// bans should record the decision here rather than acting silently. That is what
// turns an opaque removal into an explainable, appealable one.

import { prisma } from '@/lib/prisma';
import type { ModerationActionType, ModerationTargetType, ReportReason } from '@prisma/client';

export interface RecordActionInput {
  type: ModerationActionType;
  targetType: ModerationTargetType;
  /** Story/comment/post id, or the user id for ACCOUNT-level actions. */
  targetId: number;
  /** The user whose content or account is affected — receives the statement. */
  affectedUserId: number;
  /** Category the decision rests on. */
  reason: ReportReason;
  /** Plain-language explanation shown to the affected user. */
  explanation: string;
  /** Whether we relied on our terms/policies or a legal requirement. Free text. */
  legalGround?: string | null;
  /** True when a machine made the call (e.g. the publish-time toxicity check). */
  automated?: boolean;
  /** The admin who acted; omit for automated actions. */
  moderatorId?: number | null;
  /** Optional link back to the report that prompted this. */
  reportId?: number | null;
}

const ACTION_LABEL: Record<ModerationActionType, string> = {
  CONTENT_REMOVED: 'Your content was removed',
  CONTENT_HIDDEN: 'Your content was restricted',
  CONTENT_REJECTED: 'Your content was not published',
  WARNING: 'You received a warning',
  ACCOUNT_SUSPENDED: 'Your account was suspended',
  ACCOUNT_BANNED: 'Your account was terminated',
};

/**
 * Records a moderation action and sends the affected user their statement of
 * reasons through the normal notification system. Returns the created action.
 *
 * The notification is best-effort: a delivery failure must not roll back the
 * recorded decision, which is the legally meaningful artifact.
 */
export async function recordModerationAction(input: RecordActionInput) {
  const action = await prisma.moderationAction.create({
    data: {
      type: input.type,
      targetType: input.targetType,
      targetId: input.targetId,
      affectedUserId: input.affectedUserId,
      reason: input.reason,
      explanation: input.explanation,
      legalGround: input.legalGround ?? null,
      automated: input.automated ?? false,
      moderatorId: input.moderatorId ?? null,
      reportId: input.reportId ?? null,
    },
  });

  await prisma.notification
    .create({
      data: {
        userId: input.affectedUserId,
        type: 'MODERATION',
        message: `${ACTION_LABEL[input.type]}. Reason: ${input.explanation} You can request a review from your Appeals page.`,
      },
    })
    .catch(() => {});

  return action;
}
