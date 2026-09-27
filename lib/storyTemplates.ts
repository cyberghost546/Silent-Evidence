import {
  Flame,
  Search,
  Ghost,
  CloudFog,
  House,
  Eye,
  EyeOff,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';

// lib/storyTemplates.ts
// Story starter templates for real-life horror subgenres.
// Each template gives new writers a title placeholder, an opening paragraph,
// and a mood tag so the editor comes pre-populated with the right tone.
// Used on the /write page when a user picks a template.

export interface StoryTemplate {
  id: string;
  label: string; // Display name shown in the template picker
  mood: string; // Matches the Story.mood enum value in schema.prisma
  icon: LucideIcon; // lucide icon shown next to the label in the picker
  titleHint: string; // Placeholder text for the story title input
  content: string; // Rich-text HTML pre-loaded into the editor
}

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: 'campfire-horror',
    label: 'Campfire Story',
    mood: 'ATMOSPHERIC',
    icon: Flame,
    titleHint: 'The Night We Heard [Something] in the Woods',
    content: `<p>Nobody talks about what happened that summer. We made a pact — all six of us — standing around the dying fire at three in the morning, still shaking. We agreed we would never tell anyone.</p>
<p>That was fifteen years ago. I'm telling you now because I can't carry it alone anymore, and because one of the six of us just went missing.</p>
<p>It started the second night of the camping trip. We'd picked a spot off the trail, away from the other campers. Remote. Quiet. We thought that was a good thing.</p>
<p>It was after midnight when the sounds started. Not animal sounds. Something else. Something that knew our names.</p>`,
  },
  {
    id: 'true-crime',
    label: 'True Crime',
    mood: 'DARK',
    icon: Search,
    titleHint: 'The [Town/City] [Crime] That Was Never Solved',
    content: `<p>The case was closed in 1987. The detective who worked it retired two years later and refused to discuss it until the day he died. His files — forty-three boxes — were sealed under a court order that doesn't expire until 2031.</p>
<p>I've spent three years trying to understand why.</p>
<p>What I found should not have been buried. The witnesses who recanted. The evidence that disappeared from lockup. The second victim that the official report never mentions.</p>
<p>This is what actually happened.</p>`,
  },
  {
    id: 'paranormal-encounter',
    label: 'Real Paranormal',
    mood: 'SUPERNATURAL',
    icon: Ghost,
    titleHint: 'What I Saw at [Location] Was Not Natural',
    content: `<p>I am not the kind of person who believes in ghosts. I want to make that clear before I tell you this, because I know how it sounds. I'm a nurse. I work nights. I deal in facts.</p>
<p>The house on Mercer Road had been empty for eleven years when my family moved in. The real estate agent told us the previous owners had relocated for work. That was a lie.</p>
<p>I found out the truth on our third night there, when I woke up at 3:14 AM to the sound of a child singing in the hallway. I have no children. I was alone in the house.</p>
<p>The singing stopped when I opened the bedroom door. But the handprints on the wall — small, like a six-year-old's — were still warm.</p>`,
  },
  {
    id: 'unexplained-disappearance',
    label: 'Unexplained Disappearance',
    mood: 'DARK',
    icon: CloudFog,
    titleHint: 'Nobody Knows What Happened to [Name]',
    content: `<p>My sister left for the corner store at 9:47 PM on a Tuesday. I know the exact time because she texted me — "back in 10, want anything?" — and I said no, and that was the last message I ever got from her.</p>
<p>The store is four blocks away. There are cameras on every corner. She appears on three of them, walking normally, looking at her phone. On the fourth camera — the one outside the store itself — she never appears at all.</p>
<p>There is no gap in the footage. No cut. No technical fault. She simply stops existing between one camera and the next, in a stretch of well-lit street with nowhere to go.</p>
<p>That was seven years ago. I still walk that route every week, looking for something everyone else has stopped looking for.</p>`,
  },
  {
    id: 'haunted-location',
    label: 'Haunted Location',
    mood: 'SUPERNATURAL',
    icon: House,
    titleHint: 'The Truth About [Place Name]',
    content: `<p>The locals will tell you not to go near the old [place] after dark. They say it with a laugh, the way people do when they're trying to sound like they don't mean it. But watch their eyes when they say it. They mean it.</p>
<p>I went anyway. I'm a historian. I document buildings before they're demolished. I've been inside hundreds of abandoned places and nothing has ever happened to me.</p>
<p>What I found inside was not what I expected. The rooms were clean. The furniture was arranged as if someone had just stepped out. And on the kitchen table, there was a cup of tea that was still warm.</p>
<p>The building had been derelict for thirty years.</p>`,
  },
  {
    id: 'stalker-story',
    label: 'Stalker Story',
    mood: 'PARANOID',
    icon: Eye,
    titleHint: 'Someone Has Been Watching Me',
    content: `<p>It started small. The kind of thing you dismiss because you don't want to seem paranoid. A car parked outside my apartment three days in a row. A shadow that moved when I looked out the window at night. A feeling — persistent, specific — that I was being watched.</p>
<p>I told myself it was anxiety. I told my friends. They agreed. Everyone agreed it was nothing.</p>
<p>Then I found the photographs.</p>
<p>They were in an envelope in my mailbox with no return address. Forty-seven photographs of me going about my daily life — at work, at the grocery store, at the gym — taken from a distance, over what looked like several months.</p>
<p>The most recent one was taken through my bedroom window. The timestamp read 2:31 AM.</p>`,
  },
  {
    id: 'sleep-paralysis',
    label: 'Sleep Paralysis',
    mood: 'DARK',
    icon: EyeOff,
    titleHint: 'It Stands at the Foot of My Bed Every Night',
    content: `<p>Sleep paralysis, the doctors called it. A well-documented sleep disorder. The brain wakes before the body does. The hallucinations are vivid but not real. There is nothing to be afraid of.</p>
<p>They said this. I believed them. For a while.</p>
<p>The figure that stands at the foot of my bed has been there every night for eight months. Always the same height. Always in the same position. Always watching.</p>
<p>Last week my roommate — who had no idea any of this was happening — knocked on my door in the morning and asked me who the tall person in my room was. She had seen it through the gap under my door.</p>
<p>She described it exactly.</p>`,
  },
  {
    id: 'witness-account',
    label: 'Witness Account',
    mood: 'ATMOSPHERIC',
    icon: ClipboardList,
    titleHint: 'I Was There When [Event] Happened',
    content: `<p>I gave a statement to the police at the time. I told them exactly what I saw. They wrote it down, thanked me, and I never heard from them again.</p>
<p>Three months later, the official report said there were no witnesses.</p>
<p>I have kept quiet about this for a long time because I did not want the trouble. But someone died, and the truth has not been told, and I cannot in good conscience stay silent anymore.</p>
<p>Here is what I saw. All of it. Exactly as it happened.</p>`,
  },
];
