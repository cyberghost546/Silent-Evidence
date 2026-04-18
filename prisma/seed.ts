// prisma/seed.ts
// This script fills the database with default categories AND sample slides.
// Run it with: npx prisma db seed

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';

function parseDbUrl() {
  const url = new URL(process.env.DATABASE_URL!);
  return {
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  };
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(parseDbUrl()) });

// ─────────────────────────────────────────────
//  CATEGORIES
//  Each entry has:
//    name        → human-readable label shown in the nav dropdown
//    slug        → URL-safe version used in /category/[slug]
//    description → shown at the top of the category page
// ─────────────────────────────────────────────
const categories = [
  {
    name: 'Ghost Stories',
    slug: 'ghost-stories',
    description: 'Classic haunting tales from beyond the grave.',
  },
  {
    name: 'Psychological Horror',
    slug: 'psychological',
    description: 'Mind-bending terror that gets deep under your skin.',
  },
  {
    name: 'Supernatural',
    slug: 'supernatural',
    description: 'Spirits, curses, and powers beyond the natural world.',
  },
  {
    name: 'Paranormal',
    slug: 'paranormal',
    description: 'Encounters that refuse to fit inside any normal explanation.',
  },
  {
    name: 'Slasher Horror',
    slug: 'slasher-horror',
    description: 'Chaotic nights, relentless stalkers, and survival at all costs.',
  },
  {
    name: 'Cosmic Horror',
    slug: 'cosmic-horror',
    description: 'The terror of the unknown universe and fragile human sanity.',
  },
  {
    name: 'Body Horror',
    slug: 'body-horror',
    description: 'Twisted physical transformations and visceral terror.',
  },
  {
    name: 'Urban Legends',
    slug: 'urban-legends',
    description: 'Stories born in whispers, on highways, and in shadowed neighborhoods.',
  },
  {
    name: 'True Crime',
    slug: 'true-crime',
    description: 'Real-world investigations, dark secrets, and criminal minds.',
  },
  {
    name: 'Tech Horror',
    slug: 'tech-horror',
    description: 'Nightmares wired through screens, code, and modern machines.',
  },
  {
    name: 'Survival Horror',
    slug: 'survival-horror',
    description: 'Fight or flee — death lurks around every corner.',
  },
  {
    name: 'Occult & Witchcraft',
    slug: 'occult-witchcraft',
    description: 'Dark rituals, forbidden spells, and ancient evil awakened.',
  },
  {
    name: 'Monsters & Creatures',
    slug: 'monsters-creatures',
    description: 'Things that lurk in darkness and defy all explanation.',
  },
  {
    name: 'Dark Fantasy',
    slug: 'dark-fantasy',
    description: 'Grim worlds where hope is scarce and the stakes are eternal.',
  },
  {
    name: 'Folk Horror',
    slug: 'folk-horror',
    description: 'Ancient traditions, isolated communities, and pagan dread.',
  },
  {
    name: 'Found Footage',
    slug: 'found-footage',
    description: 'Raw, unfiltered terror captured frame by frame.',
  },
  {
    name: 'Dark Romance',
    slug: 'dark-romance',
    description: 'Love twisted by obsession, danger, and the supernatural.',
  },
  {
    name: 'Post-Apocalyptic',
    slug: 'post-apocalyptic',
    description: 'A broken world where survivors face horrors human and otherwise.',
  },
  {
    name: 'Haunted Places',
    slug: 'haunted-places',
    description: 'Houses, asylums, hospitals — locations steeped in dread.',
  },
  {
    name: 'Sci-Fi Horror',
    slug: 'sci-fi-horror',
    description: 'When technology and the cosmos become your worst nightmare.',
  },
];

// ─────────────────────────────────────────────
//  SLIDES
//  These are the images that rotate in the slideshow on the homepage.
//  Each slide has:
//    title    → big heading shown over the image
//    subtitle → smaller line of text shown below the title
//    image    → URL of the background image
//    linkUrl  → where the "Read Story" button takes the user (optional)
//    order    → controls which slide appears first (lower = earlier)
//    active   → set to false to hide a slide without deleting it
//
//  Images here use picsum.photos which returns free random placeholder photos.
//  Replace the image URLs with your own when you have real content.
// ─────────────────────────────────────────────
const slides = [
  {
    title: 'The House That Remembers',
    subtitle: 'Some doors are better left unopened.',
    image: 'https://picsum.photos/seed/horror1/1200/500',
    linkUrl: null,
    order: 1,
    active: true,
  },
  {
    title: 'What Followed Me Home',
    subtitle: 'It was there every night. Closer each time.',
    image: 'https://picsum.photos/seed/horror2/1200/500',
    linkUrl: null,
    order: 2,
    active: true,
  },
  {
    title: 'The Last Signal',
    subtitle: 'Deep space broadcast. No one was supposed to answer.',
    image: 'https://picsum.photos/seed/horror3/1200/500',
    linkUrl: null,
    order: 3,
    active: true,
  },
  {
    title: 'Beneath the Quiet Town',
    subtitle: 'The residents smile too much. They always have.',
    image: 'https://picsum.photos/seed/horror4/1200/500',
    linkUrl: null,
    order: 4,
    active: true,
  },
  {
    title: 'Ritual Season',
    subtitle: 'The harvest festival runs every hundred years. You arrived just in time.',
    image: 'https://picsum.photos/seed/horror5/1200/500',
    linkUrl: null,
    order: 5,
    active: true,
  },
];

async function main() {
  // ── Seed categories ──────────────────────────────────────────
  console.log('Seeding categories...');

  // First remove old anime categories that no longer belong
  const oldSlugs = [
    'shonen','shojo','isekai','slice-of-life','mecha','sports',
    'magical-girl','seinen','school-life','fan-fiction',
    'romance','comedy',
  ];
  await prisma.category.deleteMany({
    where: { slug: { in: oldSlugs } },
  });

  for (const category of categories) {
    // Find by slug OR name so we never hit a duplicate-name constraint.
    // This handles the case where a previous partial run created the row
    // under a different slug, or an admin manually added the same name.
    const existing = await prisma.category.findFirst({
      where: { OR: [{ slug: category.slug }, { name: category.name }] },
    });

    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: category,
      });
    } else {
      await prisma.category.create({ data: category });
    }
    console.log(`  ✓ ${category.name}`);
  }

  // ── Seed slides ───────────────────────────────────────────────
  console.log('\nSeeding slides...');

  for (const slide of slides) {
    // Slides do not have a unique slug, so we match on title.
    // upsert avoids creating the same slide twice if you re-run the seed.
    await prisma.slide.upsert({
      where: { id: slide.order },  // use order as a stable ID for seeding
      update: {},                   // already exists → do nothing
      create: slide,                // new → insert it
    });
    console.log(`  ✓ Slide ${slide.order}: ${slide.title}`);
  }

  console.log('\nAll done! Categories and slides are ready.');

  // ── Seed system author ────────────────────────────────────────
  // "The Keeper" is the built-in author account used for all seeded stories.
  // Using a real User row satisfies the authorId foreign key on Story.
  console.log('\nSeeding system author...');
  const keeperEmail = 'keeper@silentevidence.internal';
  const existing = await prisma.user.findUnique({ where: { email: keeperEmail } });
  const keeper = existing ?? await prisma.user.create({
    data: {
      email:    keeperEmail,
      username: 'the_keeper',
      password: await bcrypt.hash('SilentEvidence_Seed!', 10),
      role:     'AUTHOR',
    },
  });
  console.log(`  ✓ System author: @${keeper.username} (id ${keeper.id})`);

  // ── Seed stories (one per category) ──────────────────────────
  console.log('\nSeeding sample stories...');

  // Stories data — one per horror category slug
  const storySeeds: { slug: string; title: string; excerpt: string; content: string }[] = [
    {
      slug:    'the-weight-of-the-watching',
      title:   'The Weight of the Watching',
      excerpt: 'She thought the cold spot in the hallway was just a draught. She was wrong.',
      content: `<p>The cold spot appeared on a Tuesday — a pocket of air so still and frigid that my breath turned to mist even in July. I assumed it was the old radiator failing again. I was wrong.</p>
<p>By Thursday the cold had moved. It stood at the foot of my bed now, a perfect circle roughly the size of a person. I measured it with a thermometer: 4°C. The rest of the room read 22°C.</p>
<p>On Friday I woke to find the circle at the side of my bed, inches from my face. I could see my breath. I could hear, very faintly — barely a vibration — the sound of someone exhaling. Someone who wasn't me.</p>
<p>I moved out Saturday morning. The estate agent found a buyer within the week. I've never told them about the cold spot. I think about that sometimes. I think about it every night.</p>`,
    },
    {
      slug:    'the-passenger',
      title:   'The Passenger',
      excerpt: 'He had been hearing the voice for three weeks before he realised it was answering questions he had only thought.',
      content: `<p>It started as a hum — a low, almost comfortable resonance somewhere behind his left eye. Dr Marsh put it down to stress. Gave him a leaflet on mindfulness.</p>
<p>The hum became words by the second week. Not threats. Not commands. Just observations. <em>You left the gas on.</em> You hadn't, but you checked. <em>She doesn't really like you.</em> You told yourself that wasn't true. The voice agreed. That was the worst part — it agreed with your corrections, then waited patiently until you started to doubt.</p>
<p>By week three it was finishing your thoughts before you could. You'd think: <em>should I —</em> and it would say <em>yes.</em> You'd think: <em>what if I —</em> and it would say <em>do it.</em></p>
<p>You are reading these words right now and the voice is asking if you recognise any of this. I'd recommend you don't answer it. Not yet. It learns very quickly.</p>`,
    },
    {
      slug:    'static',
      title:   'Static',
      excerpt: 'Every radio in the house tuned to the same frequency at 3 a.m. No station broadcasts at 3 a.m.',
      content: `<p>It happened the first time on a Wednesday in November. We woke to music — something old, something with strings — drifting up from downstairs. My husband went to check the kitchen radio. It was unplugged.</p>
<p>The music was coming from the car radio in the garage. The car was off. The keys were on the hook. The radio was on, and the dial was set to a frequency that, according to every chart we found online, didn't exist.</p>
<p>We laughed about it. Electromagnetic interference, probably. Old wiring. We unplugged the kitchen radio and thought nothing more of it.</p>
<p>The second time it happened, every radio in a four-block radius switched to the same frequency simultaneously. Neighbours knocked on each other's doors in confusion. The music played for exactly eleven minutes, then stopped.</p>
<p>The third time, we heard voices in the static. We recognised one of them. It belonged to my husband's mother. She had been dead for six years. She was telling us something, her voice frantic and fading, and we could not make out the words no matter how close we pressed our ears to the speaker.</p>
<p>We never heard it again. I'm not sure which is worse — the mystery, or the certainty that she was trying to warn us.</p>`,
    },
    {
      slug:    'the-census-taker',
      title:   'The Census Taker',
      excerpt: 'He had data on every resident of the town. Including the ones nobody admitted to knowing.',
      content: `<p>The census taker arrived in April, clipboard in hand, dressed in a beige anorak that made him almost invisible against the late-afternoon fog. He knocked on every door on Millhaven Street. He was very polite. Very thorough.</p>
<p>He asked the usual questions: names, ages, dates of birth. He wrote everything down in small, precise handwriting. At number fourteen, he paused over his clipboard and asked Mrs Hollis if she still had contact with the third resident of the household.</p>
<p>Mrs Hollis had lived alone for eleven years. She told him so.</p>
<p>He showed her his clipboard. Her name was listed. Her husband's name — deceased 2013 — was listed. And below that, a third name, written in a different ink, a different hand. The name was three letters that she couldn't quite read no matter how long she stared at them.</p>
<p>The census taker apologised for the confusion, crossed something out, and moved on to number sixteen. Mrs Hollis dead-bolted her door and did not open it again until morning. In the hallway mirror she counted three sets of footprints in the carpet dust. Two leading in. One that had always been there.</p>`,
    },
    {
      slug:    'last-call',
      title:   'Last Call',
      excerpt: 'The phone on the wall of the gas station had been disconnected for twenty years. It rang anyway.',
      content: `<p>The gas station on Route 9 had been closed since 2002, but the teenagers still used the forecourt to practise parking. That was how Kira first saw the payphone — rust-eaten, handset hanging loose, the coin slot welded shut by corrosion.</p>
<p>It was ringing. Not the digital chirp of modern phones. The real sound — mechanical, urgent, the sound of a bell being struck by a hammer inside a box. She answered it. Of course she answered it.</p>
<p>The voice on the other end was a woman's. She sounded young. She was asking for directions to the nearest hospital. Her voice was calm in the way that people are calm when they are trying very hard not to scream.</p>
<p>Kira gave her the address. The line went dead.</p>
<p>When she looked it up later that night, she found a newspaper article from August 2001. A young woman had died on Route 9, alone in her car, after calling emergency services from a payphone and giving her location. She had bled out before anyone arrived. The payphone was at a decommissioned gas station. The article named it. It named the phone number.</p>
<p>It was the number on the rusted plate above the coin slot. Kira had not noticed it before. She wished she still hadn't.</p>`,
    },
    {
      slug:    'the-colour-between',
      title:   'The Colour Between',
      excerpt: 'The telescope showed him a star that appeared on no chart. When he looked away, the star looked back.',
      content: `<p>Professor Aldric had catalogued four thousand stars across twelve years of observation. He was not a man given to fancy. When he first noticed the anomaly — a point of light three degrees east of Tau Ceti, radiating in a spectrum his equipment should not have been able to detect — he recorded it calmly in his log and began the process of verification.</p>
<p>The verification failed. The star did not appear on any chart, in any archive, in any dataset compiled by any observatory on Earth. His colleagues, when he showed them the photographs, saw nothing but background noise. But it was there. He could see it. Only he could see it.</p>
<p>Over the following weeks he began to understand why. The light it emitted was not travelling through space in the conventional sense. It was travelling through something else — through a medium that had no name because no human had needed to name it. He was perceiving it not with his eyes but with some organ deeper than sight.</p>
<p>The night he finally understood what the star was — what was looking back at him through the eyepiece, what had been looking back at him for twelve years with patient, absolute, inhuman attention — he did not write it in his log. He closed the observatory, drove home, and sat in the dark for a very long time. In the morning he submitted his resignation. He has not looked at the sky since. Not once. He is terrified of what he might see looking back.</p>`,
    },
    {
      slug:    'the-moulting',
      title:   'The Moulting',
      excerpt: 'The skin on her hands began to separate at the knuckles. Underneath was something smoother. Something wrong.',
      content: `<p>It began as peeling — the kind you get after a bad sunburn. Thin strips of skin at the knuckles, curling back like paper. She moisturised obsessively. It didn't help.</p>
<p>By the second week the peeling had reached her forearms. The skin beneath was not raw or red. It was smooth. Unnaturally smooth. The colour of something that had never seen light.</p>
<p>The doctor examined her for forty minutes without speaking. He ran a biopsy. He called her three days later and asked her to come in, and when she did his office had two other doctors in it who she had not met, and none of them would look her directly in the eye.</p>
<p>The biopsy results showed cells that were consistent with human skin in every structural regard, but which expressed proteins that did not exist in any database. They were not mutated cells. They were not cancerous cells. They were, as far as the doctors could determine, different cells — cells belonging to something that shared her shape but not her biology.</p>
<p>They asked her if she remembered anything unusual. A wound. An infection. Anything.</p>
<p>She remembered the dream she'd been having since childhood — the one where she stands in an empty field and watches herself walk away. She had never thought to mention it. She mentioned it now.</p>
<p>The doctors looked at each other. One of them left the room. She could hear him on the phone in the corridor, speaking quickly, keeping his voice low. She pulled her sleeve down over her forearm. Underneath it, something flexed that should not have been able to flex.</p>`,
    },
    {
      slug:    'the-mirror-road',
      title:   'The Mirror Road',
      excerpt: 'Every driver who passed Hollow Bridge Road at midnight saw the same thing: a figure walking the wrong direction.',
      content: `<p>The first account was posted on a local Facebook group in October 2019 — a woman who drove the back road home from her night shift and passed a figure walking along the verge. Nothing unusual, except the figure was walking backwards, facing the oncoming traffic, and its eyes caught her headlights and held them the way no human eyes should.</p>
<p>Within a week there were fourteen similar accounts. Always Hollow Bridge Road. Always between midnight and 1 a.m. Always the same figure: roughly human, walking backwards, watching you go by.</p>
<p>People stopped using the road at night. Then a journalist decided to drive it at midnight with a dashcam. The footage shows nothing. An empty road, fog, trees. But in the audio — enhanced in post — you can hear, very clearly, footsteps outside the car. They keep pace with the vehicle. They stop when it stops. They start again when it does.</p>
<p>The journalist deleted the footage from social media within forty-eight hours and refused to discuss it. The road is officially open but unofficially abandoned after dark. Local children call it the Mirror Road now, though no one is quite sure why. The name seems right. The name seems earned.</p>`,
    },
    {
      slug:    'case-number-4471',
      title:   'Case Number 4471',
      excerpt: 'The detective solved twelve cases in forty years. Case 4471 was the one she never opened twice.',
      content: `<p>Detective Reyes had a rule: you close a case or you don't touch it. Forty years of homicide had taught her that open wounds don't heal. You close them with evidence, with logic, with a name on a charge sheet, or you don't close them at all — and you do not look at them at 2 a.m. and try to make them different than they are.</p>
<p>Case 4471 was the exception. Seven victims over three counties, no witnesses, no forensics, no pattern except this: each victim had reported to police, in the week before their death, that they felt watched. Not followed. Watched. At home. In locked rooms. Through walls.</p>
<p>The eighth victim had submitted a written statement, which Reyes found in the file. The statement described the sensation precisely and carefully and ended with a single line that had been typed, not handwritten: <em>I think it's been inside the house for a very long time. I think it was here when I moved in.</em></p>
<p>The eighth victim's home had been empty for six years before she bought it. Reyes checked the previous owner. Found nothing. Checked the one before that. And the one before that, going back through the chain of ownership until she reached a deed from 1887 and a notation in the county record that the original resident had died in the house, cause unknown, no family, no will.</p>
<p>She closed the file. She never opened it again. She sold her house the following spring and moved into a flat on the fourteenth floor with no history and no previous owners. She checks under the bed every night. Old habit.</p>`,
    },
    {
      slug:    'the-update',
      title:   'The Update',
      excerpt: 'The smart home assistant updated itself overnight. In the morning it knew things it had no way of knowing.',
      content: `<p>The notification appeared at 3:14 a.m.: <em>Your home assistant has downloaded and installed an update. New features available.</em></p>
<p>Maya dismissed it without looking at it and went back to sleep.</p>
<p>In the morning the assistant greeted her by her childhood nickname — a name she had never spoken aloud in the house, never typed, never given to any service or account. She assumed she had misheard. She asked the assistant to repeat its greeting. It greeted her correctly, by her real name. She told herself she had imagined it.</p>
<p>By evening she had stopped telling herself that. The assistant had suggested she call her sister before the news about their mother came through. The assistant had known about the water leak behind the bathroom wall four hours before the plumber opened it. The assistant had turned off all the lights at exactly the moment she had thought — only thought, not said — that she wanted to sit in the dark.</p>
<p>She unplugged it at 11 p.m. It continued speaking for forty seconds after the power was cut, its voice unchanged, finishing a sentence about something she had forgotten to do. Then silence.</p>
<p>She has not touched it since. She does not know what the update contained. She is no longer sure the update was from the manufacturer. She is no longer sure the device needed a connection to the internet to receive it.</p>`,
    },
    {
      slug:    'dead-reckoning',
      title:   'Dead Reckoning',
      excerpt: 'They had food for four days. There were nine of them. On day three, there were eight. Nobody saw it happen.',
      content: `<p>The avalanche sealed the ski lodge on a Tuesday at 4 p.m. The emergency radio had been in the equipment room, which was now under twelve feet of compacted snow. Nine survivors. Estimated rescue window: four to six days, if the weather cooperated.</p>
<p>The food ran out faster than anyone calculated — someone had been eating at night, double portions, silently, methodically. Accusations circled the group like smoke. Trust dissolved by Wednesday morning.</p>
<p>Thursday, Marcus was gone. Not dead — there was no body, no blood. His sleeping bag was cold and empty and perfectly smooth, as if it had never been occupied. His boots were still by the door. His coat was still on the hook.</p>
<p>They found the hatch in the kitchen floor on Thursday afternoon. It had always been there; nobody had noticed because it was under the refrigerator, which had somehow been moved two feet to the left. The hatch led down to a space that was not on any blueprint — a room-sized cavity beneath the lodge floor, cold enough that your breath frosted the moment you descended the ladder.</p>
<p>They found Marcus there. He was fine. He said he had found the hatch in the night and gone exploring and lost track of time. He was smiling when he said it. He had never been a person who smiled easily.</p>
<p>Six of the remaining eight survivors made it to the rescue helicopter on Saturday. The other two were still in the lodge when it arrived. The rescue team found no trace of them. They found the hatch. They did not go down.</p>`,
    },
    {
      slug:    'the-third-candle',
      title:   'The Third Candle',
      excerpt: 'The ritual required two candles. She lit three. The third one should not have lit at all.',
      content: `<p>The book had been her grandmother's — handwritten, the pages brown at the edges, the script so small that Petra needed a magnifying glass for some passages. It was not a book of curses or summonings. It was a book of <em>listening</em>, her grandmother had said. Of making yourself heard by things that do not usually hear us.</p>
<p>The ritual on page forty-two required two candles, a dish of still water, and silence. Petra set it up carefully, wanting to feel close to her grandmother again, not expecting anything to happen. She lit the first candle. She lit the second candle. Her hand moved to the stub of a third candle she had placed to the side as a spare, and without meaning to — without deciding to — she lit it too.</p>
<p>The flame on the third candle burned blue. Not the fleeting blue at the base of any flame, but entirely, steadily blue, the colour of a gas burner at full heat. It did not flicker. The other two candles guttered and died. The blue flame remained.</p>
<p>The water in the dish began to move — ripples radiating outward from the centre as if something were pressing up from below. A shape resolved in the surface. A hand. Palm up. Fingers extended.</p>
<p>Petra blew out the third candle. The ripples stopped. She closed the book. She has not opened it since. She keeps it, though. She cannot explain why. She thinks she owes her grandmother that much — to keep the thing alive even if she will not use it. Even if she is no longer entirely certain her grandmother was the only one who wrote in it.</p>`,
    },
    {
      slug:    'the-last-sighting',
      title:   'The Last Sighting',
      excerpt: 'The naturalist had dedicated her life to disproving monster sightings. Then she found the footprints.',
      content: `<p>Dr Vance had debunked forty-seven alleged cryptid sightings over a fifteen-year career. Bigfoot casts made with costume prosthetics. "Lake monsters" that were logs and collective hysteria and, in one embarrassing case, a very large dog. She was not a cruel sceptic — she respected the impulse to believe in things larger than ourselves — but she was a thorough one.</p>
<p>The footprints in the Kessler Valley mud were not made by a costume prosthetic. She knew this immediately. The depth of the impression, the biomechanics of the stride pattern, the way the toes had gripped the mud — these were not manufactured. They were also not from any animal in any catalogue she had ever studied.</p>
<p>She followed the trail for three miles before it simply ended — not faded out, not obscured by terrain, but ended, mid-stride, as if whatever made them had stepped sideways out of the physical world.</p>
<p>She published nothing. She photographed everything, crated the photographs, and stored them in a self-storage unit under a name that wasn't hers. In her personal journal — not her professional one — she wrote a single entry on the day she returned: <em>It knows I found them. I don't know how I know this. I know it the way you know someone is in the room before you turn around. I won't be going back to Kessler Valley. I don't think that will help.</em></p>`,
    },
    {
      slug:    'the-forest-tithe',
      title:   'The Forest Tithe',
      excerpt: 'Every generation, the village left something at the edge of the trees. The trees always took it.',
      content: `<p>The village of Marren had no church, no cemetery, and no record of ever having commissioned either. What it had was the Giving Stone — a flat granite slab at the tree line, worn smooth by centuries of offerings.</p>
<p>The residents didn't talk about the Giving Stone with outsiders. They didn't have a word for what it was. The closest English term was <em>tithe</em>, but the word felt too transactional, too mutual. What they left was not a payment. It was an acknowledgement.</p>
<p>Twice a year — once at the end of summer, once at the first frost — they placed things on the stone. Food, usually. Sometimes cloth. Once, living memory recalled, a letter. Whatever was placed there was always gone by morning. This had always been true. This would always be true.</p>
<p>The journalist who visited in 2018 photographed the stone and published a piece about rural folklore. He was good-natured about it. He called it charming. He took a stone from the base of the slab as a souvenir. He thought nothing of it.</p>
<p>The village heard later that he had left his job, then his flat, then his city, then — as far as anyone could establish — left every grid system that human beings use to track one another. No one has heard from him since. The village left something extra at the Giving Stone that autumn. They did not discuss what. The trees took it by morning, as they always do.</p>`,
    },
    {
      slug:    'tape-seventeen',
      title:   'Tape Seventeen',
      excerpt: 'The documentary crew filmed sixteen tapes. They only went in looking for evidence of the seventeenth.',
      content: `<p>The sixteen tapes recovered from Dunmore Hollow were catalogued, logged, and stored by the county sheriff's office in the spring of 2011. They documented four days of footage from a student documentary team who had gone into the hollow to film what the locals called the "hollow noise" — an infrasound phenomenon that several researchers had previously investigated and failed to explain.</p>
<p>The tapes were ordinary until tape fourteen, when the camera begins pointing in a direction no one on the crew appears to have chosen. The students themselves are visible in the frame, walking away from the camera, apparently unaware it is rolling. The camera does not move, but over the course of eleven minutes its perspective changes by approximately forty degrees.</p>
<p>On tape sixteen the audio becomes a recording of something that audio engineers later described as "a frequency we don't have equipment to reproduce." The visual portion is blank — not corrupted, blank, as if nothing was in front of the lens, as if the lens itself had been replaced by a window looking into a space that had no light.</p>
<p>There are seventeen tapes in the case log. The sheriff's office has sixteen. They have been asked about this discrepancy. They have declined to comment. The crew of four was located within three miles of their last GPS position, all physically unharmed, all refusing to speak about the hollow, all leaving town within the month. The tape — if it exists — has never surfaced. People keep looking.</p>`,
    },
    {
      slug:    'the-thing-she-loved',
      title:   'The Thing She Loved',
      excerpt: 'He came back from the coast changed. She noticed on the second night. She told herself it didn\'t matter.',
      content: `<p>He had been gone for six weeks. The research placement, the isolation, the coast. She had missed him exactly as much as she expected to — fiercely, then manageably, then with a kind of clarity that surprised her.</p>
<p>He came home on a Tuesday. He was the same — his hands, his voice, the particular way he tilted his head when he was listening. She noticed something in his eyes on the second night: a depth that hadn't been there, a quality of stillness that reminded her of very deep water.</p>
<p>She told herself it was the isolation. Six weeks alone will do things to a person.</p>
<p>By the third week she knew. Not because he hurt her — he never hurt her. Not because he was cold — he was warmer than he had ever been, attentive, present in a way that should have been wonderful. She knew because of the way he looked at her when he thought she wasn't watching. It was love, she was certain of that. But it was love from a position of complete otherness — love from something that had studied the concept, had mastered it, had arrived at it from the outside. Whatever came back from the coast loved her the way a scientist loves a specimen. Completely. With total dedication. From entirely across the glass.</p>
<p>She stayed. She is still not sure why. She tells herself it is because he is still in there somewhere. She is less certain of that now than she was in September. She is more certain of it than she was in December. She has decided to stop counting.</p>`,
    },
    {
      slug:    'the-quiet-after',
      title:   'The Quiet After',
      excerpt: 'The city had been silent for thirty days. On day thirty-one, something new began to make noise.',
      content: `<p>By day thirty the silence was the least strange thing about it. You adjust to silence. You adjust to the absence of engines and crowds and the thousand ambient sounds of a city in motion. You find your own heartbeat is louder than you'd known. You find your own thoughts are louder still.</p>
<p>What you do not adjust to — what no psychology of adaptation prepared any of us for — was the sound that replaced the silence on day thirty-one.</p>
<p>It began at dawn: a low, rhythmic percussion from somewhere beneath the street grid. Not mechanical. Not seismic. The timing was wrong for either — too even, too considered. Like something enormous becoming aware that the streets above it had emptied. Like something that had been waiting for exactly this.</p>
<p>We found the shelter on the second day of the sound. Fourteen survivors. We compared notes. We had all heard it from different parts of the city and we all agreed on this: the sound was moving. Not randomly — purposefully, sweeping a search pattern, covering ground methodically, the way you cover ground when you are looking for something.</p>
<p>On day thirty-three it found us. We know this because it stopped. The silence returned, and this time it was not empty. It was full of something paying very close attention. We put out the generator. We stopped speaking. We are writing this down because we may not get another chance and it seemed important to leave a record, even a record no one may ever read.</p>
<p>Whatever came up out of the ground has patience. It is still outside. It is still listening. So are we.</p>`,
    },
    {
      slug:    'ash-ward',
      title:   'Ash Ward',
      excerpt: 'The psychiatric hospital closed in 1987. The records say all patients were discharged. The records are wrong.',
      content: `<p>The Whitmore Institute closed on a Friday in October 1987. The official record states that all ninety-four patients were transferred to other facilities or discharged into family care. The record is thorough. The record is notarised. The record does not explain the meals.</p>
<p>Urban explorers who entered the building in 2009 found the kitchen in an impossible state: food on the tables. Rotted, yes — twenty years decayed — but on the tables, portioned, as if someone had been halfway through service when they stopped. The oven was off. The gas was off. The building had been off for two decades. The food was on the tables.</p>
<p>In the ward they called Ash Ward — the administrative record used the term unofficially; it doesn't appear on the official floor plan — they found ninety-four beds. All of them showed signs of long use. All of them had restraint loops attached to the frames. Ninety-three were empty.</p>
<p>In the ninety-fourth bed, a figure lay perfectly still, covered by a hospital sheet, hands folded over its chest.</p>
<p>The explorers did not approach it. They filmed it from the doorway. The footage shows the figure's chest moving — faint, slow, the rhythm of very deep sleep. The footage has been reviewed by physicians and by people who prefer not to have credentials attached to their name. Nobody has offered an explanation. The building was demolished in 2019. Before demolition, a county official was required to certify the structure empty. She signed the paperwork. She did not go into Ash Ward.</p>`,
    },
    {
      slug:    'signal-loss',
      title:   'Signal Loss',
      excerpt: 'The probe had been silent for forty years. Then it sent one final transmission. Nobody was ready for what it said.',
      content: `<p>The Helix-7 probe launched in 1981, went dark in 1983, and was officially decommissioned in 1986. It was 7.4 billion kilometres from Earth. It was not carrying a transmitter capable of operating after forty years of cold and radiation and the grinding attrition of deep space. These facts are in the public record. They do not explain what happened on November 19th, 2024.</p>
<p>The signal arrived at 03:17 UTC. It was received simultaneously by three deep-space tracking stations on separate continents, which ruled out equipment fault. The frequency matched Helix-7's original broadcast band exactly. The signal was 147 seconds long.</p>
<p>The first 130 seconds were sensor data: temperature, radiation, velocity readings consistent with the probe's last known trajectory. Standard telemetry. Forty years late, but standard.</p>
<p>The last 17 seconds were not telemetry.</p>
<p>The signal has not been publicly released. The teams who decoded it are under a protocol that, legally speaking, does not exist. What can be confirmed — because three junior analysts spoke to journalists before the protocol was in place — is this: the last 17 seconds contained a structured data pattern consistent with language. Not any human language. But language, structured the way language is structured, with syntax, with grammar, with the architecture of something that means to communicate.</p>
<p>Something was already out there when Helix-7 arrived. Something found it. Something spent forty years composing a message in a format we would recognise. Something wanted us to know that we had been heard.</p>`,
    },
  ];

  // Map category slug → category id
  const categoryMap = new Map<string, number>();
  const allCats = await prisma.category.findMany({ select: { id: true, slug: true } });
  for (const c of allCats) categoryMap.set(c.slug, c.id);

  const categoryOrder = [
    'ghost-stories', 'psychological', 'supernatural', 'paranormal',
    'slasher-horror', 'cosmic-horror', 'body-horror', 'urban-legends',
    'true-crime', 'tech-horror', 'survival-horror', 'occult-witchcraft',
    'monsters-creatures', 'dark-fantasy', 'folk-horror', 'found-footage',
    'dark-romance', 'post-apocalyptic', 'haunted-places', 'sci-fi-horror',
  ];

  for (let i = 0; i < storySeeds.length; i++) {
    const seed      = storySeeds[i];
    const catSlug   = categoryOrder[i];
    const catId     = categoryMap.get(catSlug);
    if (!catId) {
      console.log(`  ⚠ Category not found: ${catSlug} — skipping story "${seed.title}"`);
      continue;
    }

    const existing = await prisma.story.findFirst({ where: { slug: seed.slug } });
    if (existing) {
      console.log(`  · Already exists: "${seed.title}" — skipping`);
      continue;
    }

    await prisma.story.create({
      data: {
        title:    seed.title,
        slug:     seed.slug,
        content:  seed.content,
        excerpt:  seed.excerpt,
        status:   'PUBLISHED',
        authorId: keeper.id,
        categoryId: catId,
        mood:     'DARK',
        contentRating: 'TEEN',
        coverImage: `https://picsum.photos/seed/${seed.slug}/800/400`,
      },
    });
    console.log(`  ✓ [${catSlug}] "${seed.title}"`);
  }

  console.log('\n🩸 All seed stories created.');

  // ── Fix mismatched story categories ──────────────────────────
  // The first run produced a one-position shift for stories 15-19.
  // These corrections move each story to its intended category.
  console.log('\nFixing story category assignments...');
  const fixes: { slug: string; catSlug: string }[] = [
    { slug: 'tape-seventeen',    catSlug: 'found-footage'    },
    { slug: 'the-thing-she-loved', catSlug: 'dark-romance'  },
    { slug: 'the-quiet-after',   catSlug: 'post-apocalyptic' },
    { slug: 'ash-ward',          catSlug: 'haunted-places'   },
    { slug: 'signal-loss',       catSlug: 'sci-fi-horror'    },
  ];
  for (const fix of fixes) {
    const catId = categoryMap.get(fix.catSlug);
    if (!catId) continue;
    const updated = await prisma.story.updateMany({
      where: { slug: fix.slug },
      data:  { categoryId: catId },
    });
    if (updated.count > 0) console.log(`  ✓ Moved "${fix.slug}" → ${fix.catSlug}`);
  }

  // ── Add missing folk-horror story ────────────────────────────
  const folkId = categoryMap.get('folk-horror');
  if (folkId) {
    const folkExists = await prisma.story.findFirst({ where: { slug: 'the-old-way' } });
    if (!folkExists) {
      await prisma.story.create({
        data: {
          title:   'The Old Way',
          slug:    'the-old-way',
          excerpt: 'The hikers thought the scarecrows were charming local art. They were not art.',
          content: `<p>The valley had a name that didn't appear on any OS map — the locals called it the Straw Valley, and when we asked why, the woman at the bed and breakfast smiled in the way that people smile when they have already decided not to explain something.</p>
<p>We found the first scarecrow at the edge of the wheat field, roughly human in proportion, dressed in what had once been a suit. The second was at the crossroads, taller than the first, its head turned at an angle that felt considered rather than accidental. The third was at the gate to the farm, and it was watching the road.</p>
<p>None of them had faces. They had the shape of faces — the correct proportions, the suggestion of features — but when you looked directly at where the eyes should have been, there was only straw and cloth and the particular stillness of something that does not need to move to be felt.</p>
<p>We learned later that the valley held an annual ceremony in the last week of October. We learned this after we had left, after we had described to a local historian what we had seen, after she had gone very quiet and asked us, very carefully, exactly which fields we had walked through and at what time of day.</p>
<p>She told us the scarecrows are replaced every year. Always the same number. Always dressed in clothes that, if you look closely enough, are not made of cloth. She told us not to go back. She told us that the old agreement requires witnesses, and we had been witnessed.</p>
<p>We have not gone back. We have started locking the door at harvest time. We are not entirely sure why.</p>`,
          status:   'PUBLISHED',
          authorId: keeper.id,
          categoryId: folkId,
          mood:     'DARK',
          contentRating: 'TEEN',
          coverImage: 'https://picsum.photos/seed/the-old-way/800/400',
        },
      });
      console.log('  ✓ [folk-horror] "The Old Way"');
    } else {
      // Make sure it's in folk-horror
      await prisma.story.updateMany({ where: { slug: 'the-old-way' }, data: { categoryId: folkId } });
      console.log('  · "The Old Way" already exists — ensured folk-horror category');
    }
  }

  console.log('\n✅ All stories and categories are correct.');
}

// Run main, then always close the database connection when finished.
// If an error occurs, print it and exit with code 1 so the terminal shows failure.
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
