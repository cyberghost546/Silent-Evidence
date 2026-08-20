// lib/reactions.ts
// Shared definitions for the three reaction systems (comments, confessions,
// recipes) — one place that decides which reactions exist and how each renders.
//
// STORAGE FORMAT — READ THIS BEFORE CHANGING `id`:
//   The `id` of each reaction is the exact string persisted in the database
//   (CommentReaction.emoji, ConfessionReaction.emoji, RecipeReaction.emoji) and
//   it participates in a @@unique constraint on all three tables. Historically
//   those ids were the emoji characters themselves, so they still look like
//   emoji here — but they are now opaque identifiers, never rendered. The UI
//   draws `icon` instead, and `label` is what a human reads.
//
//   Changing an `id` therefore orphans every existing row that used the old
//   value: those reactions would silently disappear from their counts. Renaming
//   them to plain strings ('scared', 'skull', …) needs a data migration that
//   rewrites the stored values first — it is not a code-only change.
//
// Adding a NEW reaction is safe: pick an id no row uses yet.

import {
  ThumbsUp, Skull, Ghost, Flame, Heart, Siren, Flashlight, Utensils, Wine,
  Sparkles, UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

export type ReactionDef = {
  /** Value stored in the database — an opaque id, never displayed. */
  id: string;
  /** Icon rendered in place of the old emoji. */
  icon: LucideIcon;
  /** Human-readable name, used for tooltips and screen readers. */
  label: string;
};

// Reactions available on a comment.
export const COMMENT_REACTIONS: ReactionDef[] = [
  { id: '👍',  icon: ThumbsUp,   label: 'Agree'  },
  { id: '😱',  icon: Siren,      label: 'Scared' },
  { id: '💀',  icon: Skull,      label: 'Dead'   },
  { id: '🔥',  icon: Flame,      label: 'Fire'   },
  { id: '❤️', icon: Heart,      label: 'Love'   },
];

// Reactions available on a confession.
export const CONFESSION_REACTIONS: ReactionDef[] = [
  { id: '😱',  icon: Siren,      label: 'Scared'  },
  { id: '💀',  icon: Skull,      label: 'Dead'    },
  { id: '👻',  icon: Ghost,      label: 'Haunted' },
  { id: '🕯️', icon: Flashlight, label: 'Vigil'   },
];

// Reactions available on a recipe.
export const RECIPE_REACTIONS: ReactionDef[] = [
  { id: '🔥',  icon: Flame,    label: 'Fire'    },
  { id: '💀',  icon: Skull,    label: 'Deadly'  },
  { id: '😋',  icon: Utensils, label: 'Tasty'   },
  { id: '👻',  icon: Ghost,    label: 'Spooky'  },
];

// Recipe type filter tabs (not reactions — the tab bar above the feed).
export const RECIPE_TYPES: { key: string; label: string; icon: LucideIcon }[] = [
  { key: '',        label: 'All',     icon: UtensilsCrossed },
  { key: 'food',    label: 'Food',    icon: Utensils },
  { key: 'drink',   label: 'Drinks',  icon: Wine },
  { key: 'ritual',  label: 'Rituals', icon: Sparkles },
];

/** Ids only — for server-side allowlist validation. */
export const COMMENT_REACTION_IDS    = COMMENT_REACTIONS.map(r => r.id);
export const CONFESSION_REACTION_IDS = CONFESSION_REACTIONS.map(r => r.id);
export const RECIPE_REACTION_IDS     = RECIPE_REACTIONS.map(r => r.id);

/**
 * reactionDef — resolves a stored id to its display definition.
 * Returns undefined for ids no longer offered (e.g. a reaction that was removed
 * from the list but still has rows in the database), so callers can skip them
 * rather than rendering a blank button.
 */
export function reactionDef(set: ReactionDef[], id: string): ReactionDef | undefined {
  return set.find(r => r.id === id);
}
