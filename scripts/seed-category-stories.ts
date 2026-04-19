// scripts/seed-category-stories.ts
// Creates one horror story for each of the 15 remaining categories (ids 6-20).
// Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-category-stories.ts

import { PrismaClient, Mood } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as dotenv from 'dotenv';
dotenv.config();

function parseDbUrl() {
  const url = new URL(process.env.DATABASE_URL!);
  return { host: url.hostname, port: parseInt(url.port) || 3306, user: url.username, password: url.password, database: url.pathname.slice(1) };
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(parseDbUrl()) });

const stories = [
  // ── Slasher (id=6) ────────────────────────────────────────────────────────
  {
    title: 'The Babysitter\'s Last Call',
    slug: 'the-babysitters-last-call',
    categorySlug: 'slasher',
    mood: Mood.DRAMATIC,
    featured: false,
    excerpt: 'The children were already in bed when the phone rang. The voice on the other end said: "Have you checked on them yet?"',
    coverImage: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=800&q=80',
    content: `<p>The Harmon house was quiet by nine. Both kids — Lily, seven, and Marcus, five — had gone down without a fight, which should have been the first sign that something was wrong.</p>

<p>Jenna settled onto the couch with her phone and a bag of microwave popcorn and told herself she deserved a peaceful night. She was seventeen. She had exams Monday. She was doing the Harmons a favor.</p>

<p>The phone rang at 9:47.</p>

<p>She assumed it was Mrs. Harmon checking in. Instead, a voice she didn't recognize said, quietly and without any greeting: "Have you checked on them yet?"</p>

<p>"Who is this?" Jenna asked.</p>

<p>The line clicked dead.</p>

<p>She told herself it was a wrong number. She checked the caller ID — UNKNOWN — and put the phone down and watched another twenty minutes of her show before the unease became too loud to ignore.</p>

<p>She went upstairs.</p>

<p>Lily's room first. The girl was asleep, one arm thrown over her stuffed rabbit, breathing slow and even. Jenna felt the tension in her shoulders release slightly.</p>

<p>Marcus's room was at the end of the hall. She pushed the door open.</p>

<p>He was asleep too. But his window was open.</p>

<p>She hadn't opened it. She'd never been in his room before tonight. And the screen — the screen was on the floor, pushed in from the outside.</p>

<p>Jenna stood very still.</p>

<p>Then the phone rang again.</p>

<p>She answered it in the hallway, her back against the wall, her eyes on the stairs.</p>

<p>"Good," the voice said. "You checked."</p>

<p>"Who are you?" Her voice came out steadier than she felt. "What do you want?"</p>

<p>A pause. Then: "I want you to look in the closet."</p>

<p>"Which closet?"</p>

<p>"The one behind you."</p>

<p>Jenna turned slowly. There was a linen closet directly behind her, door slightly ajar, a thin line of darkness showing at the edge.</p>

<p>She did not open it.</p>

<p>She grabbed Lily from her bed, grabbed Marcus from his, and ran down the stairs and out the front door with both children half-asleep and confused in her arms. She ran to the neighbor's house. She pounded on the door until the lights came on.</p>

<p>The police found the linen closet empty.</p>

<p>They found something else, though, in the space under the stairs: a phone. Prepaid. Still warm. Three calls made to Jenna's number.</p>

<p>And a name carved into the drywall beside it, shallow but deliberate, in letters the size of a child's handwriting:</p>

<p><em>Next time.</em></p>`,
  },

  // ── Body Horror (id=7) ────────────────────────────────────────────────────
  {
    title: 'The Itch',
    slug: 'the-itch',
    categorySlug: 'body-horror',
    mood: Mood.MYSTERIOUS,
    featured: false,
    excerpt: 'It started as a small bump under his left shoulder blade. By Thursday, it was moving.',
    coverImage: 'https://images.unsplash.com/photo-1533240332313-0db49b459ad6?w=800&q=80',
    content: `<p>It started as a small bump under his left shoulder blade. Owen noticed it in the shower on Monday — not painful, just present. A raised patch of skin, maybe the size of a grape, warm to the touch.</p>

<p>He forgot about it by Tuesday.</p>

<p>On Wednesday his wife mentioned, while rubbing his back, that the bump seemed larger. She pressed it gently. Owen winced. She stopped pressing.</p>

<p>"You should see someone," she said.</p>

<p>"It's probably a cyst," he said. "I'll call the doctor next week."</p>

<p>On Thursday morning he woke at 3 a.m. to a sensation he had no good word for. Not pain exactly. More like pressure from the inside — localized, rhythmic, as though something beneath the skin was searching for a more comfortable position.</p>

<p>He turned on the bathroom light. Twisted to look in the mirror.</p>

<p>The bump had doubled in size. And it was not symmetrical anymore. One side had a faint angular protrusion — almost, if he didn't look at it directly, like a bent elbow.</p>

<p>Owen stood in the bathroom for a long time, perfectly still, watching the bump in the mirror.</p>

<p>It moved. Slow, deliberate — a quarter inch to the left, a quarter inch back, like something repositioning itself in a very tight space.</p>

<p>He pressed his hand flat against it and felt, unmistakably, something press back.</p>

<p>He was at the hospital by 4 a.m. The doctor who examined him said nothing for a long time. Then she said she wanted to run some scans. Her voice was professionally neutral in a way that Owen had learned, in forty-three years, usually preceded bad news.</p>

<p>The scans showed a mass, roughly the size and shape of a closed fist. The radiologist called in a second radiologist. The second called in a third.</p>

<p>None of them could explain the mass's apparent density, its temperature differential from the surrounding tissue, or the faint but unmistakable pattern the imaging software kept trying to resolve into something it recognized.</p>

<p>The pattern that looked, on the scan, like fingers.</p>

<p>The surgery was scheduled for the following morning. Owen didn't sleep.</p>

<p>At 6 a.m., the bump was gone.</p>

<p>Smooth skin. No trace. Not even tenderness.</p>

<p>Owen went home. He told his wife it must have been a cyst after all, that it had resolved on its own, that he was fine.</p>

<p>He didn't mention the new bump he'd found that morning. Smaller than the first one. Just below his right collarbone.</p>

<p>Still warm.</p>

<p>Already moving.</p>`,
  },

  // ── Haunted House (id=8) ──────────────────────────────────────────────────
  {
    title: 'The Room at the End of the Hall',
    slug: 'the-room-at-the-end-of-the-hall',
    categorySlug: 'haunted-house',
    mood: Mood.MYSTERIOUS,
    featured: true,
    excerpt: 'The real estate listing said five bedrooms. The house only had four doors. Everyone who lived there knew not to ask about the fifth.',
    coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
    content: `<p>The listing said five bedrooms. Sophie counted four doors when she toured the house.</p>

<p>The agent, a pleasant woman named Carol who smelled of lavender and spoke quickly, moved past the discrepancy without acknowledging it. Sophie noticed but said nothing. The price was extraordinary. The neighborhood was good. The ceilings were high and the light was beautiful and she was tired of renting.</p>

<p>She bought the house.</p>

<p>The fourth door — the last one on the right at the end of the upstairs hall — was painted over. Not recently. The paint was old and thick, layered over what must have been a dozen previous coats, the kind of accumulation that takes decades. There was no knob, no keyhole. Just a rectangular outline in the wall and the ghost of hinges beneath layers of white.</p>

<p>Sophie assumed it was a closet that the previous owners had sealed for storage reasons. She sanded it and repainted it and forgot about it.</p>

<p>For about three weeks she forgot about it.</p>

<p>Then the sounds started. Not at night — she had expected night. In the afternoon. Around three o'clock, when the light in the hall went amber and the house was perfectly quiet, she would hear something from behind that door that she could only describe as furniture being rearranged. Slow, heavy drags. Muffled thuds. The sound of a room being lived in.</p>

<p>She pressed her ear to the wall once and heard breathing.</p>

<p>She called Carol.</p>

<p>Carol's phone had been disconnected.</p>

<p>She called the county records office and asked about the history of the property. A clerk with a flat voice told her that the house had been sold eighteen times in fifty years. That was unusual, the clerk said. Then he said he had to go and hung up.</p>

<p>Sophie looked up previous owners online. She found nine of them. They had all moved out of state. Three of them had moved to states that no longer matched their social media locations — accounts abandoned, addresses outdated.</p>

<p>One of them, a woman who had lived in the house for only four months in 2009, had left a review of the property on an obscure real estate forum. The review was seven words long:</p>

<p><em>Don't open the room. Just don't. Please.</em></p>

<p>Sophie stared at the door at the end of the hall for a long time that evening.</p>

<p>She had not opened it.</p>

<p>But the smell coming from beneath it — warm, sweet, unmistakably domestic, like coffee and someone else's laundry — had begun to feel familiar.</p>

<p>Like a welcome.</p>

<p>Like an invitation it had been waiting a very long time to extend.</p>`,
  },

  // ── Occult & Witchcraft (id=9) ────────────────────────────────────────────
  {
    title: 'The Circle on Midsummer\'s Eve',
    slug: 'the-circle-on-midsummers-eve',
    categorySlug: 'occult-witchcraft',
    mood: Mood.DARK,
    featured: false,
    excerpt: 'They told her the ritual was harmless. Just six women in a field at midnight, calling something old. Nobody mentioned what happened when it answered.',
    coverImage: 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=800&q=80',
    content: `<p>They told her it was harmless.</p>

<p>Six women in a field at midnight, a candle at each point of the circle, words in a language none of them actually spoke. Tradition, her cousin Vera said. Midsummer. The old way. They did it every year. Nothing had ever happened.</p>

<p>Rena should have asked what "nothing" meant.</p>

<p>The field was owned by Vera's grandmother, a woman of ninety who had not left her house in eleven years and who watched them from the upstairs window as they walked out with their candles. Rena waved. The old woman did not wave back. She pressed her hand flat against the glass in a gesture that Rena didn't understand until much later.</p>

<p>She had been trying to stop them.</p>

<p>The circle went well, at first. The words were odd in the mouth — guttural, older than Latin, older than anything Rena could identify — but they fell into the rhythm easily, all six of them, voices rising and falling in the warm summer dark.</p>

<p>The candles went out at midnight.</p>

<p>All six simultaneously, in still air, with no wind.</p>

<p>In the darkness, Rena heard something at the edge of the field. Not approaching — just present, the way a person stands when they have been standing there for a while and are no longer bothering to conceal it.</p>

<p>Then someone in the circle — she never knew who — said the final word.</p>

<p>The word the ritual script marked with a symbol they'd all assumed was decorative.</p>

<p>The candles relit.</p>

<p>The field was empty. The other five women were fine, laughing, brushing grass off their knees, congratulating themselves on a successful midsummer.</p>

<p>Rena stood very still. Because something had changed. Not outside — inside. A weight behind her sternum, a faint doubled heartbeat that wasn't hers, a sense of occupancy she couldn't name.</p>

<p>She told no one.</p>

<p>For three days she felt it watching through her eyes.</p>

<p>On the fourth day it spoke to her, in the old language, from inside her own skull, and she understood every word.</p>

<p>On the fifth day she drove back to Vera's grandmother's house.</p>

<p>The old woman answered the door before Rena could knock. She looked at Rena's eyes for a long moment.</p>

<p>"Which word?" she said.</p>

<p>Rena told her.</p>

<p>Vera's grandmother sat down heavily on her porch steps and said nothing for a long time.</p>

<p>"My mother said the same word," she finally said, "in 1962."</p>

<p>"What happened to her?" Rena asked.</p>

<p>The old woman looked at her with an expression that was not pity — something beyond pity, something that had already grieved and moved past grieving.</p>

<p>"She stopped being her," she said. "Gradually. Then completely."</p>

<p>Inside Rena's chest, the second heartbeat quickened with what felt terribly like anticipation.</p>`,
  },

  // ── Creature Feature (id=10) ──────────────────────────────────────────────
  {
    title: 'Something in the Water',
    slug: 'something-in-the-water',
    categorySlug: 'creature-feature',
    mood: Mood.DRAMATIC,
    featured: false,
    excerpt: 'The lake had been drained for forty years. When they refilled it for the resort development, the locals all left town the same week.',
    coverImage: 'https://images.unsplash.com/photo-1548268770-66184a21657e?w=800&q=80',
    content: `<p>The lake had been drained in 1983, after the third disappearance.</p>

<p>Nobody explained why draining it was supposed to help. The official record cited "algal contamination," which was the kind of explanation people accepted in 1983 if it came with enough paperwork. The locals knew better. The locals left.</p>

<p>Forty years later, a resort developer from the city bought the land, refilled the basin, stocked it with fish, and began construction on seventeen lakeside cabins and a spa.</p>

<p>The construction crew worked for six days.</p>

<p>On the seventh day, the foreman called the developer and said the crew had quit. All fourteen of them. Simultaneously. The foreman said they had seen something in the water during the night and he was not willing to discuss what it was and he would be returning his advance payment.</p>

<p>The developer hired a second crew.</p>

<p>The second crew lasted four days.</p>

<p>The developer, a man named Gerald who had built forty-three resort properties in twenty years and believed firmly in the supremacy of financial incentive over superstition, drove out to the site himself on a Wednesday in October to assess the situation.</p>

<p>The lake was beautiful in the autumn light. Still. Dark green, deep, perfectly calm. He stood at the edge and felt the particular satisfaction of a man who has transformed something worthless into something profitable.</p>

<p>He took some photographs for the investor deck.</p>

<p>In one of them, he noticed later, there was a shape beneath the surface. Long. Much longer than any fish. It was oriented vertically, which fish weren't, and its upper end — he could not see it clearly in the photo but he spent forty minutes zooming in — its upper end appeared to have a face.</p>

<p>It was looking up at him.</p>

<p>The shape had not been there when he took the photo. He was certain of it. He would have noticed something that large.</p>

<p>Unless it had moved very quickly, in the second between his finger pressing the shutter and the image capturing the light.</p>

<p>Unless it had risen to the surface for a single, specific purpose.</p>

<p>Gerald sold the land the following week at a significant loss. He never went back.</p>

<p>The lake is still there. It's listed as undeveloped commercial real estate. Three developers have inquired about it in the past two years.</p>

<p>Each of them drove out to see the property.</p>

<p>None of them made an offer.</p>

<p>None of them will say why.</p>`,
  },

  // ── Post-Apocalyptic (id=11) ──────────────────────────────────────────────
  {
    title: 'The Last Radio Signal',
    slug: 'the-last-radio-signal',
    categorySlug: 'post-apocalyptic',
    mood: Mood.DRAMATIC,
    featured: false,
    excerpt: 'Three years after the Collapse, a lone survivor picks up a repeating radio signal. Someone is still broadcasting. The message is: do not come here.',
    coverImage: 'https://images.unsplash.com/photo-1533240332313-0db49b459ad6?w=800&q=80',
    content: `<p>Three years after the Collapse, Mara found the signal on a Tuesday in November.</p>

<p>She had been scanning for two years, methodically, the way her father had taught her. Frequencies in order. Patience. The radio was solar-powered and she had maintained it better than anything else she owned, better than her weapons, better than her water filter, because silence was the thing she could not endure.</p>

<p>The signal was on 7.285 MHz, which was an amateur band, which meant a person. Not a recording, not an automated emergency broadcast — a person, with a transmitter, somewhere to the northwest, broadcasting on a schedule.</p>

<p>She listened for three days before she understood the pattern.</p>

<p>The message repeated every four hours, the same voice, a woman, speaking clearly and with a kind of exhausted determination:</p>

<p><em>"This is Station Clearwater. We have food, medicine, and shelter. Population fourteen. Do not come here. I repeat — do not come here. This is not an invitation. Stay away. This is Station Clearwater."</em></p>

<p>Mara wrote down the message word for word and read it until she had memorized it and then sat with it for a long time.</p>

<p>Food. Medicine. Fourteen people.</p>

<p>Do not come here.</p>

<p>She tried to raise them on the frequency. The woman did not respond to transmissions — only broadcast. Either she couldn't hear incoming signals or she wouldn't answer them.</p>

<p>Mara spent a week telling herself the warning was clear and she should respect it. She spent another week telling herself she was dying alone and the warning might not apply to her specifically.</p>

<p>Then she packed her gear and headed northwest.</p>

<p>She found Station Clearwater on the fifteenth day. A reinforced farmhouse. Solar panels. A water tower. Real infrastructure — the kind that took months to build.</p>

<p>There were no lights. No movement. The front door was open.</p>

<p>Inside, she found the transmitter, still broadcasting on its timer. The voice was a recording. Had always been a recording.</p>

<p>She found the journal last, on the kitchen table, open to the final entry.</p>

<p>The last line read: <em>If you found this, you didn't listen. That means it got you too. I'm sorry. We tried to warn everyone. It follows the signal.</em></p>

<p>Mara set the journal down.</p>

<p>In the silence of the empty farmhouse, she heard the radio crackle.</p>

<p>Then her own voice came out of it, in a frequency she hadn't transmitted on, saying words she hadn't said yet.</p>

<p>Saying: <em>This is Station Clearwater. Do not come here.</em></p>`,
  },

  // ── Survival Horror (id=12) ───────────────────────────────────────────────
  {
    title: 'Night Three',
    slug: 'night-three',
    categorySlug: 'survival-horror',
    mood: Mood.DRAMATIC,
    featured: false,
    excerpt: 'She had survived two nights in the wilderness after the crash. Night three was different. Something had found the wreckage.',
    coverImage: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=800&q=80',
    content: `<p>Night one, Petra built a fire. Night two, she kept it burning.</p>

<p>Night three, she put it out.</p>

<p>The plane had gone down in northern forest — the kind of forest with no trails and no name on any map she'd ever seen. She was the only survivor. She had a first aid kit, a foil emergency blanket, a water bottle, and a pocket knife. She had injuries she was managing and a broken ankle she was pretending wasn't as bad as it was.</p>

<p>She had the radio, too, but the radio wasn't receiving. She kept it on anyway. Kept it close.</p>

<p>The first two nights had been survivable. Cold. Frightening in the abstract way that wilderness at night is frightening — the sounds of animals moving, the darkness between the trees, the distance from everything human. But manageable.</p>

<p>Night three she heard something that was not an animal.</p>

<p>It was at the edge of the firelight at first — a presence she registered before she heard any sound, a shift in the texture of the dark. Then the sound came: deliberate footsteps, slow and heavy, moving around the perimeter of her camp in a wide circle.</p>

<p>Not approaching. Circling.</p>

<p>Petra killed the fire. If she couldn't see it, it couldn't see her — that was the logic, whether it was good logic or not.</p>

<p>In the dark she heard it stop.</p>

<p>Then she heard it inhale.</p>

<p>Long. Deep. Like something orienting itself by smell.</p>

<p>She pressed herself against the fuselage of the wreck and did not move and barely breathed for the next four hours. At some point the sound of footsteps resumed, this time moving away, growing fainter, until the forest was silent again.</p>

<p>At dawn she tried the radio again.</p>

<p>It picked up a signal — faint, breaking up, but a human voice. She grabbed it. Gave her coordinates. The voice on the other end asked her to confirm: was she alone? Yes, she said. Was she injured? Yes. Was she safe?</p>

<p>She looked at the ground around her camp in the morning light.</p>

<p>Footprints, in the soft earth. Bipedal. Human-spaced. Very large.</p>

<p>And among them, pressed deep into the mud just at the edge of where the firelight would have reached — the clear impression of something kneeling down. Leaning close. Close enough to smell her.</p>

<p>"I don't know," she told the radio. "Send someone fast."</p>`,
  },

  // ── Folk Horror (id=13) ───────────────────────────────────────────────────
  {
    title: 'The Harvest Rite',
    slug: 'the-harvest-rite',
    categorySlug: 'folk-horror',
    mood: Mood.DARK,
    featured: false,
    excerpt: 'The village festival happened every seven years. Outsiders were welcome. They were always welcomed warmly. None of them were ever seen leaving.',
    coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
    content: `<p>The village of Ashmore held its festival every seven years.</p>

<p>Tom found it by accident, following a detour that his GPS had insisted was correct and which had deposited him on a single-track road in the middle of moorland at six in the evening with a quarter tank of petrol.</p>

<p>The festival was already underway when he arrived: lanterns strung between the old stone buildings, long tables in the square loaded with food, a band playing something that sounded almost like folk music but with intervals that sat wrong in the ear. The whole village appeared to be present — seventy, eighty people, all ages.</p>

<p>They welcomed him with the particular warmth of people who had been expecting a guest and are pleased to see him arrive on schedule.</p>

<p>He found this odd, since he'd arrived by mistake, but the food was extraordinary and the ale was strong and the people were genuinely pleasant and when they insisted he stay the night — the roads back were treacherous in dark, they said, and he'd drunk too much to drive safely — he agreed.</p>

<p>He woke at 3 a.m. to silence and firelight outside his window.</p>

<p>The square had been cleared. The long tables were gone. In the center, where the band had played, a structure had been built from dry wood and wicker and plaited straw — man-shaped, roughly, tall as a house.</p>

<p>The whole village stood around it in a ring, facing inward.</p>

<p>Tom watched from the window, cold and very still, as the village elder walked to the structure and placed her hand against it and spoke words Tom couldn't hear.</p>

<p>The structure moved.</p>

<p>Not in the wind — with intention, the wicker limbs flexing, the head turning on its straw neck to face the circle of villagers one by one.</p>

<p>Then it turned to face the inn.</p>

<p>Then it turned to face Tom's window.</p>

<p>The village elder looked up at the same moment. She smiled at him — the same warm, genuine smile she'd offered when he arrived — and raised her hand in a small, welcoming wave.</p>

<p>Tom stepped back from the window. His car keys were on the dresser. The door was unlocked.</p>

<p>He ran.</p>

<p>He made it to his car. He made it to the road. He drove for two hours without stopping and when he finally pulled over his hands were shaking too badly to steer.</p>

<p>He looked up Ashmore when he got home. Found nothing. No village by that name in any county. No festival. No record.</p>

<p>He found only one thing: a photograph from 1973, black and white, on a local history archive. A village festival. Long tables in a square. Lanterns.</p>

<p>And in the background, half-visible at the edge of the frame, a man at an upstairs window.</p>

<p>Looking out with Tom's exact expression.</p>`,
  },

  // ── Serial Killer (id=14) ─────────────────────────────────────────────────
  {
    title: 'The Collector\'s Archive',
    slug: 'the-collectors-archive',
    categorySlug: 'serial-killer',
    mood: Mood.DARK,
    featured: false,
    excerpt: 'Detective Rivera found the apartment immaculate. One bedroom, one desk, seventeen notebooks. Each notebook was a life. Every life had a final entry.',
    coverImage: 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=800&q=80',
    content: `<p>The apartment was immaculate.</p>

<p>Detective Rivera had processed hundreds of crime scenes in eighteen years and she had learned that the state of a space told you more about its occupant than any interview. This space said: controlled. Deliberate. A mind that found disorder intolerable.</p>

<p>One bedroom. One kitchen. One desk beneath the single window. On the desk, arranged in two precise rows, seventeen notebooks. Identical — black, hardcover, the kind sold at art supply stores.</p>

<p>Rivera pulled on gloves and opened the first one.</p>

<p>A name. A date. A photograph paperclipped to the inside front cover — candid, taken at distance, a woman laughing at something off-camera. Then pages of observation: daily schedule, route to work, coffee order, the name of the podcast she listened to on the train, the book on her nightstand visible through the window of her apartment on the fourth floor.</p>

<p>Rivera turned to the last entry in the notebook. A single line, in the same neat handwriting as everything else:</p>

<p><em>November 14th. She never saw me.</em></p>

<p>Rivera checked the misper database on her phone. A woman matching the photograph's description had been reported missing on November 15th of the previous year. Never found.</p>

<p>She opened the second notebook. Another name. Another photograph. Another final entry.</p>

<p>She worked through all seventeen.</p>

<p>Sixteen had final entries. The seventeenth notebook was different. No photograph inside the front cover. No final entry. The observations went up to three days ago — current. Ongoing.</p>

<p>The subject's name was at the top of the first page.</p>

<p>Rivera read it twice.</p>

<p>Then she checked the date on the most recent entry: today.</p>

<p>She looked up from the notebook at the window. The window faced the building across the street — apartments, lit windows, ordinary evening life.</p>

<p>Her phone rang. Her partner, calling to say the registered occupant of the apartment had been found — he'd been on a business trip for two weeks, knew nothing about the notebooks.</p>

<p>Someone else had been living here.</p>

<p>Rivera turned slowly and looked at the apartment again. Properly. At the closet door, which was not fully closed.</p>

<p>At the darkness in the gap.</p>

<p>At the fact that she had been in this apartment for eleven minutes and had not once checked the closet.</p>

<p>The door swung open before she could reach it.</p>

<p>There was no one inside.</p>

<p>But on the floor, in the same neat handwriting, was a note that had not been there eleven minutes ago.</p>

<p><em>I update in real time.</em></p>`,
  },

  // ── Lovecraftian (id=15) ──────────────────────────────────────────────────
  {
    title: 'What the Deep Places Know',
    slug: 'what-the-deep-places-know',
    categorySlug: 'lovecraftian',
    mood: Mood.MYSTERIOUS,
    featured: true,
    excerpt: 'The oceanographic survey found the structure at 11,000 meters. It had geometry that shouldn\'t exist. The crew who saw the footage were changed by it.',
    coverImage: 'https://images.unsplash.com/photo-1548268770-66184a21657e?w=800&q=80',
    content: `<p>The survey vessel <em>Aldous</em> was mapping the Mariana Basin when the sonar returned the anomaly.</p>

<p>Dr. Chen had processed thousands of sonar readings. She knew the signatures of seamounts, of hydrothermal vents, of wrecks and geological formations and the various debris of human civilization that had sunk to the deep ocean over the past century. She knew what things looked like at depth, distorted by pressure and darkness and the limits of instrumentation.</p>

<p>She did not know what she was looking at.</p>

<p>The structure — she used the word structure because it was the only word that fit — was at 11,340 meters, in a region that no survey had previously mapped in detail. It was large. Her best estimate, based on the sonar return, was that it was approximately three kilometers across. It had geometry.</p>

<p>That was the part she kept returning to: the geometry.</p>

<p>Natural formations at depth were varied but ultimately reducible to geological processes — the logic of pressure and heat and mineral deposition. The logic was legible. This was not legible. The angles were consistent in a way that spoke of intention, but the angles themselves were wrong in a way she could not precisely articulate, as though the structure had been designed according to a geometry that acknowledged mathematics she hadn't encountered.</p>

<p>They sent the ROV down.</p>

<p>The footage it returned was forty-seven minutes long. Dr. Chen watched it alone in the analysis room at 2 a.m., four days into the return voyage.</p>

<p>She watched it through to the end.</p>

<p>She could not describe, afterward, what she had seen in the footage's final twelve minutes. Not because she lacked vocabulary — she was precise and articulate and had spent twenty years developing language for what the ocean contained. But because the part of her mind that processed visual information into coherent description appeared to have — not failed. Refused.</p>

<p>The other researchers watched it. Each of them afterward described the same phenomenon: the first thirty-five minutes clearly, in matching detail. Then a gap. Then the ROV returning to the surface.</p>

<p>Twelve minutes, collectively unremembered.</p>

<p>But not unchanged by. Chen noticed it first in herself, then in the others: a new orientation. A recalibration of scale. A persistent and not unpleasant sensation of smallness — not the distressing smallness of insignificance, but the clarifying smallness of suddenly understanding, for the first time, exactly what size you were in relation to everything else.</p>

<p>The footage was classified. The <em>Aldous</em> was rerouted. The survey was declared inconclusive.</p>

<p>Chen filed the official report. She used the approved language. She omitted the twelve minutes.</p>

<p>She has not omitted them from her own mind. She finds, increasingly, that she does not want to. That whatever the structure knew, and shared with her in those twelve minutes she can't recall, has made the world feel correctly sized for the first time in her life.</p>

<p>She has requested reassignment to the Pacific sector.</p>

<p>She wants to go back down.</p>`,
  },

  // ── Ghost Story (id=16) ───────────────────────────────────────────────────
  {
    title: 'Still Here',
    slug: 'still-here',
    categorySlug: 'ghost-story',
    mood: Mood.DRAMATIC,
    featured: false,
    excerpt: 'After his daughter died, Thomas kept her bedroom exactly as it was. Then one morning he found the bed made. She had never made her own bed in her life.',
    coverImage: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=800&q=80',
    content: `<p>Thomas kept her room exactly as it was.</p>

<p>This was not unusual for a grieving parent. The grief counselor had mentioned it — the impulse to preserve, to hold the space of the lost person intact. Normal. Understandable. Something to revisit in time, when he was ready.</p>

<p>He was not ready. He did not revisit it.</p>

<p>For eight months the room stayed as Ella had left it: clothes on the chair, textbooks open on the desk to pages she'd never finish reading, the string lights above the bed left on a timer that still cycled on at nine p.m. and off at eleven, because that had been the rule and he could not make himself change it.</p>

<p>On the morning of the eighth month, he opened her door to—he told himself—check the window he thought he'd heard rattling in the night.</p>

<p>The bed was made.</p>

<p>He stood in the doorway for a long time. Ella had never made her bed. In seventeen years, not once. It had been a long-standing argument between them, lighthearted, the kind of small domestic battle that seems consequential until suddenly nothing is consequential at all.</p>

<p>The bed was made with some care. The pillows were straight. The duvet was smooth. It looked the way a bed looked in a hotel, or in a house where someone was trying to make a good impression.</p>

<p>Thomas sat on the edge of it. He pressed his hand to the pillow.</p>

<p>"Ella," he said. Not a question. Not a demand. Just her name, in the air of her room, because he didn't know what else to say.</p>

<p>From the desk, very quietly, came the sound of a page turning.</p>

<p>He looked. The textbook was still open, but to a different page. He was certain of the page it had been on — he'd memorized it the way he'd memorized everything about this room — and this was not it.</p>

<p>He crossed to the desk. The new page was a chapter on cellular biology. Halfway down, a sentence had been underlined, recently, in blue pen:</p>

<p><em>Energy cannot be created or destroyed; it can only change form.</em></p>

<p>He picked up the pen beside the book. The ink was fresh.</p>

<p>He sat at his daughter's desk and wept for a very long time.</p>

<p>When he finally looked up, the string lights were on.</p>

<p>It was eleven in the morning. The timer didn't run until nine.</p>

<p>He left them on.</p>`,
  },

  // ── Demonic Possession (id=17) ────────────────────────────────────────────
  {
    title: 'The Passenger',
    slug: 'the-passenger',
    categorySlug: 'demonic-possession',
    mood: Mood.DARK,
    featured: false,
    excerpt: 'Father Malone had performed twelve exorcisms. He had never once believed in them. The thirteenth case made him wish he still didn\'t.',
    coverImage: 'https://images.unsplash.com/photo-1533240332313-0db49b459ad6?w=800&q=80',
    content: `<p>Father Malone had performed twelve exorcisms in thirty-one years of ministry, and he had not believed in a single one.</p>

<p>He was not cynical about this. He was, he believed, honest. The Church had a process for these things — assessment, documentation, evaluation of psychological and medical explanations first. In his experience, the explanations always existed. Mental illness. Trauma. Occasionally deliberate performance, for reasons that were usually comprehensible and always sad.</p>

<p>He approached the thirteenth case the same way.</p>

<p>The girl was fourteen. Her name was Isabel. She had been a normal child, by all accounts, until six weeks prior, when her family reported a sudden and complete change in personality. She would not speak about what had changed. She would not speak at all, to her family. She spoke to Father Malone, once, at the beginning of their first session, before it became clear that what was speaking to him was not Isabel.</p>

<p>Father Malone was careful about his language. He documented everything. He used clinical terms. <em>Dissociative episode. Alternate personality state. Intrusive ideation.</em></p>

<p>But the thing in the room with him used his name.</p>

<p>Not his given name. The name his mother had called him before she died when he was six — a private name, a family name, a name he had never told anyone and had not thought of in decades.</p>

<p>And it told him what he'd done with that name. Where he'd buried it. Why.</p>

<p>Father Malone set down his notes.</p>

<p>"You're not Isabel," he said.</p>

<p>"No," said the voice from Isabel's body, with Isabel's mouth, in a register nothing like Isabel's voice. "But she's still here. She can hear you. She's asking you not to fail her the way you failed yourself."</p>

<p>Father Malone had thirty-one years of trained equanimity. He used all of it.</p>

<p>"What do you want?" he asked.</p>

<p>The thing smiled with Isabel's face. "To see if you actually believe in anything. The last eleven didn't."</p>

<p>He performed the rite. The full rite, properly, for the first time in his life — not as a therapeutic exercise or a pastoral performance but as an act of genuine opposition, every word weighted with something he would not have called faith that morning but couldn't call anything else by the time he finished.</p>

<p>It left. He was certain it left — the room changed, the air changed, Isabel crumpled and wept and called for her mother in her own voice.</p>

<p>Father Malone sat for a long time in the emptied room afterward.</p>

<p>Then he took out his notebook and wrote, in the margin of his careful clinical documentation, a single word.</p>

<p>The word was: <em>Real.</em></p>

<p>That night he dreamed of the thing, and in the dream it thanked him.</p>

<p>"Now you know," it said pleasantly. "Now we can really get started."</p>`,
  },

  // ── Dystopian Horror (id=18) ──────────────────────────────────────────────
  {
    title: 'The Compliance Score',
    slug: 'the-compliance-score',
    categorySlug: 'dystopian-horror',
    mood: Mood.DARK,
    featured: false,
    excerpt: 'In the new system, your score determined everything. Housing, employment, food access. Mira\'s score dropped overnight for no reason she could identify.',
    coverImage: 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=800&q=80',
    content: `<p>Mira's score was 847 on Monday morning, which was respectable — not excellent, but solidly in the green band. Green meant full access: housing tier three, employment eligibility, standard food allocation. She had been in the green band for nine years.</p>

<p>On Tuesday morning her score was 412.</p>

<p>She stared at the number on her screen for a long time, waiting for it to correct itself. It did not correct itself. Numbers in the system did not correct themselves. The system, the ministry said, was accurate to six decimal places and had an error rate of zero point zero zero three percent, which meant that statistically it did not make mistakes, which meant that any score change was a reflection of real behavior.</p>

<p>Mira had not changed her behavior.</p>

<p>She filed a review request. The automated response said review requests were processed in fourteen to twenty-one business days and that pending review, current scores remained in effect. At 412 she was in the yellow band. Yellow meant: reduced food allocation, housing tier one only, employment eligibility suspended pending review.</p>

<p>She went to her employer to explain. Her access card no longer opened the door.</p>

<p>She went to her apartment. The locks had already been reconfigured for tier one access; her building was tier three. She stood in the lobby of her own building with her single bag and her review request confirmation number.</p>

<p>She called the review helpline. The wait time was ninety minutes. She waited. A human voice answered and asked her name and score, then said there was a notation on her file — she had been in contact with a scored individual in the red band. Had she been in contact with anyone recently?</p>

<p>Mira thought. She had spoken to her sister last week. Her sister had mentioned, in passing, that she'd been assigned to a re-education program. Mira hadn't asked why.</p>

<p>"Contact with red-band individuals may affect your proximity score," the voice said.</p>

<p>"My sister," Mira said. "I spoke to my sister for eleven minutes."</p>

<p>"The system weighs all interactions," the voice said. "Your review is in queue. Is there anything else I can help you with?"</p>

<p>There was not. There was nothing anyone in the system could help her with, because the system was helping itself, continuously, automatically, and its help looked a great deal like digestion.</p>

<p>Mira sat in the lobby of her former building.</p>

<p>She checked her score again. Force of habit.</p>

<p>389.</p>

<p>She had not moved. She had not spoken to anyone. She had only checked her score.</p>

<p>The system, she realized, was watching her watch it. And it was taking notes.</p>`,
  },

  // ── Dark Fantasy (id=19) ──────────────────────────────────────────────────
  {
    title: 'The Price of the Witch\'s Bargain',
    slug: 'the-price-of-the-witchs-bargain',
    categorySlug: 'dark-fantasy',
    mood: Mood.DARK,
    featured: false,
    excerpt: 'The witch at the crossroads would grant any wish. She was always honest about the price. The horror was that people agreed anyway.',
    coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
    content: `<p>The witch at the crossroads was honest.</p>

<p>This was what made her dangerous. Liars could be outmaneuvered. Riddles could be solved. But honesty — complete, unambiguous honesty about what a bargain would cost — had a way of peeling away every defense a person thought they had.</p>

<p>The farmer came to her in autumn. His wife was ill. He wanted her well. He offered the witch everything he had: his farm, his savings, his future harvests.</p>

<p>"I don't want those things," the witch said. She was sitting on the fence post at the crossroads, which was somehow more unsettling than if she'd been standing. "I'll cure your wife. In exchange, the next ten years of your life belong to me."</p>

<p>"My life," the farmer repeated.</p>

<p>"You'll live them. You'll experience every day. But the choices you make in those ten years won't be yours. I'll direct them. You'll have no agency. Everything you do will serve my purposes. At the end of ten years, your wife will be well and you'll have your life back."</p>

<p>The farmer was silent for a long time.</p>

<p>"What will you have me do?" he asked. "In those ten years."</p>

<p>"I don't know yet," the witch said. "I rarely do, in advance. The world is complicated and I have many interests. Some of what I'll need from you will be minor. Some of it won't be."</p>

<p>"Will I hurt anyone?"</p>

<p>"Almost certainly."</p>

<p>The farmer looked at his hands. Thought of his wife, pale and fading, in the bed he'd carried her to that morning.</p>

<p>"She'll really be well?" he said. "At the end?"</p>

<p>"At the end," the witch said, "your wife will be perfectly well, and you'll be yourself again, and ten years will have passed in which you'll have done things you can't currently imagine."</p>

<p>The farmer agreed.</p>

<p>He didn't have a choice. That was the thing the witch understood and her clients rarely did until too late: a person who truly loves another person has already made the choice, in every moment they've loved them. The bargain is just the confirmation of what was always going to happen.</p>

<p>She cured the wife.</p>

<p>She kept the farmer for ten years and used him well.</p>

<p>At the end of it she returned him to himself, as promised. His wife was healthy. He was intact. He remembered everything.</p>

<p>He came back to the crossroads in the eleventh year.</p>

<p>"I want to bargain again," he said.</p>

<p>The witch looked at him with what was, for a witch, something very close to compassion.</p>

<p>"No," she said gently. "You don't."</p>

<p>"My daughter is ill," he said.</p>

<p>The witch was quiet for a long time.</p>

<p>Then she got off the fence post.</p>`,
  },

  // ── True Crime Horror (id=20) ─────────────────────────────────────────────
  {
    title: 'Case File: The Doll Maker',
    slug: 'case-file-the-doll-maker',
    categorySlug: 'true-crime-horror',
    mood: Mood.DARK,
    featured: false,
    excerpt: 'The detective thought she was investigating a theft ring. Then she found the workshop. Then she found the dolls. Then she understood what had been stolen.',
    coverImage: 'https://images.unsplash.com/photo-1548268770-66184a21657e?w=800&q=80',
    content: `<p>Detective Harlow caught the case on a Tuesday in February, which is what she remembered — not because Tuesdays were significant but because the fluorescent in her office had been flickering since Monday and she'd spent Tuesday morning convinced she was getting a migraine and then the call came in and the migraine became irrelevant.</p>

<p>The initial report was theft. A series of unusual items taken from homes in the Millhaven district over a period of eight months: personal photographs, children's drawings, handwritten letters, hair from hairbrushes, baby teeth kept in keepsake boxes. Small things. Intimate things. Things with no obvious resale value.</p>

<p>The victims hadn't connected them. Each had filed separately, assuming the thefts were isolated. A junior officer had spotted the pattern and flagged it. Harlow picked it up.</p>

<p>She found the workshop through a canvas of storage unit rentals. Unit 114, paid in cash, registered to a name that didn't exist.</p>

<p>She documented everything before she touched anything. That was training. She was glad of it later, because the documentation meant she had a record of the order in which she understood what she was looking at.</p>

<p>The shelves first — forty, fifty of them, floor to ceiling, organized by a logic she didn't initially grasp. The dolls on them: handmade, cloth bodies, button eyes, each one slightly different in size and proportion and coloring.</p>

<p>Then the files on the worktable — each doll had a file. Each file had photographs. Each doll, she understood, was a person.</p>

<p>She had misunderstood the nature of the theft. The photographs and letters and hair and teeth had not been taken as components of anything — they had been taken as research. As reference material. Every stolen item was filed under a name. Every name had a doll.</p>

<p>Harlow counted forty-seven dolls.</p>

<p>She put the names through missing persons.</p>

<p>Thirty-one matches. People who had disappeared over a period of nine years. People who had been looked for and not found, across four counties.</p>

<p>She found them. Eventually. Not alive. But she found them.</p>

<p>What she never found, in three years of investigation, was the maker. The unit had been vacated — precisely, professionally, leaving only the dolls and files. The maker knew she was coming, which meant the maker had been watching the investigation, which meant the maker was watching her.</p>

<p>She still has one of the files. Not officially. Personally.</p>

<p>The file is hers. The doll in it has her face.</p>

<p>It was made before she took the case.</p>`,
  },
];

async function main() {
  const author = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    ?? await prisma.user.findFirst();

  if (!author) {
    console.error('No users found. Create an account first.');
    process.exit(1);
  }
  console.log(`Author: ${author.username} (id=${author.id})\n`);

  for (const s of stories) {
    const existing = await prisma.story.findUnique({ where: { slug: s.slug } });
    if (existing) {
      console.log(`SKIP (exists): ${s.title}`);
      continue;
    }

    const category = await prisma.category.findUnique({ where: { slug: s.categorySlug } });
    if (!category) {
      console.log(`SKIP (no category '${s.categorySlug}'): ${s.title}`);
      continue;
    }

    const story = await prisma.story.create({
      data: {
        title:      s.title,
        slug:       s.slug,
        content:    s.content,
        excerpt:    s.excerpt,
        coverImage: s.coverImage,
        mood:       s.mood,
        featured:   s.featured,
        status:     'PUBLISHED',
        authorId:   author.id,
        categoryId: category.id,
      },
    });
    console.log(`CREATED [${category.name}]: ${story.title} (id=${story.id})`);
  }

  console.log('\nDone!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
