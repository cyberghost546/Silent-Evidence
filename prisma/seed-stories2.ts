import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const AUTHOR_ID = 1;

const stories = [
  // ── True Stories (1) ──────────────────────────────────────────
  {
    categoryId: 1,
    title: 'I Found Hidden Cameras in My Rental',
    slug: 'i-found-hidden-cameras-in-my-rental',
    excerpt:
      'I only noticed the tiny lens because the light caught it at the wrong angle. What I found next changed how I sleep forever.',
    coverImage: 'https://picsum.photos/seed/true2/800/400',
    content: `I had been renting the apartment for four months before I found the first one. It was a Saturday morning in October and I was moving a bookshelf to vacuum behind it. The light from the window caught something in the smoke detector — a tiny, perfect circle of glass that had no business being there.

I stood on a chair and looked closer. A lens. Pointing directly at the bed.

I pulled it out carefully. It was a small wireless camera, self-contained, with its own battery pack and a micro SD card. The card held eighty-three days of footage.

I called the police before I watched any of it. A detective came out within the hour. While we waited for forensics, I walked through the apartment looking for more.

We found three others. In the bathroom. In the second bedroom. Behind the vent cover in the hallway.

The landlord was arrested two weeks later. He had twelve tenants. The police found footage going back six years.

I moved into a hotel that night. I now own a radio-frequency detector. I sweep every room I stay in before I unpack. Hotels, Airbnbs, rental properties — every single one.

People ask me if I'm paranoid. I tell them I'm educated.`,
  },
  {
    categoryId: 1,
    title: 'The Man Who Came to the Wrong House',
    slug: 'the-man-who-came-to-the-wrong-house',
    excerpt: 'He knocked at midnight and called me by name. The problem is, he had never met me.',
    coverImage: 'https://picsum.photos/seed/true3/800/400',
    content: `I want to preface this by saying I have thought about this for years and I still have no satisfying explanation.

It was a Tuesday night in late November. I was awake at midnight — I work late, it's normal for me — when there was a knock at the front door. Not a tentative knock. Three firm, deliberate raps.

I looked through the peephole. A man, mid-forties, dressed normally. Nobody I recognised.

I opened the door with the chain on.

"Is everything alright?" he asked. He said my name. My full name.

I told him I didn't know him. He looked confused. He said he was a friend of my father's and that my father had called him and asked him to check on me because I wasn't answering my phone.

My father has been dead for nine years.

I closed the door and called the police. When they arrived and spoke to the man, he was completely cooperative. He showed them a phone — a basic flip phone — and there was a call log showing a call from a number he said was my father's. The number had been disconnected since 2015.

The police checked the number. It was my father's old mobile number. The account had been closed after his death.

There is no record of who made that call. The man was released without charge. He seemed genuinely bewildered.

I changed my locks the next day. I have not told my mother.`,
  },

  // ── Paranormal (2) ────────────────────────────────────────────
  {
    categoryId: 2,
    title: 'The Mirror That Showed the Wrong Reflection',
    slug: 'the-mirror-that-showed-the-wrong-reflection',
    excerpt:
      'For three weeks, the antique mirror in my hallway showed me one second behind. Then it started showing something else entirely.',
    coverImage: 'https://picsum.photos/seed/para2/800/400',
    content: `My wife found the mirror at an estate sale. Victorian, she said. The frame was ornate dark wood, slightly worn at the corners. It was beautiful and I had no objection to it hanging in the hallway.

The first time I noticed something wrong was about a week after we hung it. I walked past it on the way to the kitchen and my reflection moved a beat late. Not a significant delay — a fraction of a second, the kind of thing you'd dismiss as tiredness.

I dismissed it as tiredness.

It happened again the next day. And the day after. I started pausing in front of the mirror, watching. My reflection would pause after me, like a video with buffering issues. My wife stood in front of it and said she saw nothing unusual. The reflection moved perfectly in sync with her.

Only mine was delayed.

In the third week, I came home from a run and stopped in the hallway to catch my breath. I looked in the mirror.

My reflection was not looking back at me. It was looking slightly to the left. At something beside me.

I turned. Nothing there. I turned back to the mirror.

My reflection was smiling. I was not smiling.

We sold the mirror the following weekend. The buyer was delighted with it. I didn't tell him why we were selling. I check every mirror I pass now. Just for a moment. Just to make sure it moves when I do.`,
  },
  {
    categoryId: 2,
    title: 'The Voice on the Baby Monitor',
    slug: 'the-voice-on-the-baby-monitor',
    excerpt:
      'We heard a voice on the baby monitor that was not our daughter. It knew things it could not have known.',
    coverImage: 'https://picsum.photos/seed/para3/800/400',
    content: `Our daughter Maisie was eight months old. We had a standard audio monitor — nothing fancy, no camera, just sound. We kept it on the nightstand.

It was my husband who heard it first. He woke me at two in the morning, shaking my arm. "There's someone talking to her," he said.

We both listened. Maisie's breathing, steady and slow. And then a voice, low and gentle, speaking in what sounded like a soft hum. Not words exactly. More like someone murmuring a lullaby in a language we didn't recognise.

We both went to her room. She was asleep. Perfectly calm. Nobody else was there.

We chalked it up to interference from a neighbour's device. It's common with older monitors. We told each other this repeatedly over the next few days.

Then on a Thursday night, the voice spoke in English.

Three words, clear enough that we both heard them from the hallway: "She looks happy."

We stood outside that door for a very long time before we opened it. Maisie was awake, staring up at the ceiling, making the small pleased sounds she makes when something interests her.

We replaced the monitor the next day. We replaced it with a camera model.

For about a week after we switched, every morning when we reviewed the night footage, Maisie would be awake between two and three, looking up at something near the ceiling and smiling.

She stopped doing it when she started talking. She has never mentioned it.`,
  },

  // ── Urban Legends (3) ─────────────────────────────────────────
  {
    categoryId: 3,
    title: 'The Smiling Man of Decker Avenue',
    slug: 'the-smiling-man-of-decker-avenue',
    excerpt:
      'Every person who has reported seeing the Smiling Man describes the same thing: too tall, too thin, and a smile that does not belong on a human face.',
    coverImage: 'https://picsum.photos/seed/urban2/800/400',
    content: `Decker Avenue runs through the older part of the city, the part that was built in the 1920s and has never quite been redeveloped. The streetlights are spaced too far apart. Late at night, there are long stretches of near-dark between pools of orange light.

The Smiling Man has been reported on Decker Avenue since at least the 1970s. The accounts are consistent across forty years of sightings: an unusually tall figure, thin, wearing dark clothing, standing still on the footpath. Always facing whoever sees him. Always smiling.

The smile is the detail everyone remembers. Too wide, they say. Too many teeth. A smile that doesn't move or change regardless of what is happening around it.

The Smiling Man doesn't follow people. He doesn't speak. He just stands there, smiling, watching.

A woman named Vera described seeing him in 1987: "He was under the streetlight by the hardware store. I walked toward him because I thought it was someone I knew from the posture. When I got close enough to see his face I turned around and walked the other way very fast. I looked back once. He was still standing there. Still smiling. He hadn't moved at all."

In 2019, a man posted a photograph online. Dark street, a figure in the middle distance. The comments filled immediately with people saying they recognised Decker Avenue and that they had seen the same figure.

The photograph has since been deleted. The person who posted it has not been active online since.`,
  },
  {
    categoryId: 3,
    title: 'The Black Car That Follows Teenagers Home',
    slug: 'the-black-car-that-follows-teenagers-home',
    excerpt: 'Every town has a version of this story. Ours was different because it was true.',
    coverImage: 'https://picsum.photos/seed/urban3/800/400',
    content: `When I was fifteen, every kid in our town knew about the Black Car. The story went that if you were out alone after dark, a black sedan would fall in behind you and follow you — not fast, not aggressive, just patient — until you reached your front door.

Then it would sit outside for a few minutes and drive away.

We all assumed it was a local story, the kind of thing adults made up to keep teenagers inside. My friend Dana didn't assume that.

Dana was walking home from a friend's house one October night at about ten. She was on Henderson Road, about six blocks from home, when she noticed headlights behind her. A black car, moving slowly. She sped up. It sped up. She crossed the street. It crossed the street.

She called me from her phone. I stayed on the line while she ran the last four blocks home. She got inside and locked the door. Through the front window, she watched the car sit outside her house for three minutes and then pull away.

She told her parents. Her mother, unexpectedly, went white.

"That happened to me too," her mother said. "When I was your age. On this same road."

Her mother had grown up in the same town. The Black Car had been there at least thirty years before Dana's night. The make and model she described — a 1970s-era sedan — would have been contemporary in her mother's time. Vintage in Dana's.

We never found out what it was. Nobody ever has.`,
  },

  // ── Short Nightmares (4) ──────────────────────────────────────
  {
    categoryId: 4,
    title: 'The Extra Setting',
    slug: 'the-extra-setting',
    excerpt: 'I live alone. This morning I came downstairs to find the table set for two.',
    coverImage: 'https://picsum.photos/seed/short2/800/400',
    content: `I live alone. I have lived alone since my divorce three years ago. I am very deliberate about this because the solitude took a long time to feel comfortable and I have come to appreciate the particular quiet of a house that is only yours.

This morning I came downstairs at seven to make coffee and found the kitchen table set for two.

Two place mats. Two bowls. Two spoons. Two glasses of orange juice, already poured, already cold.

I stood in the kitchen doorway for a long time.

Both glasses had been drunk from. Not emptied — there was juice remaining in each — but the rim of each glass was wet in the way that means someone's mouth had been there. Both bowls had a small residue of dried milk in them, as if someone had eaten cereal and left the bowl to dry overnight.

I called the police. They found no sign of entry. Every window locked, every door locked, the alarm armed exactly as I had set it.

The forensic team dusted the glasses. They found my fingerprints. They found one other set that did not match anything in any database.

I'm staying at a hotel tonight. I don't know when I'll go back. What's stopping me isn't the break-in.

It's that both settings were on the same side of the table. Whoever sat there sat very close to me.`,
  },
  {
    categoryId: 4,
    title: 'The Tooth',
    slug: 'the-tooth',
    excerpt: "I woke up with someone else's tooth in my hand. The DNA results came back last week.",
    coverImage: 'https://picsum.photos/seed/short3/800/400',
    content: `I woke up on a Wednesday morning with my hand clenched in a fist. This is not unusual for me — I clench my fists in my sleep, it's stress-related, my doctor has mentioned it several times.

What was unusual was what was in my fist when I opened it.

A tooth. A human molar, by the look of it. Adult-sized, with a small silver filling on one side, slightly yellowed the way old teeth are.

It was not mine. I have all my teeth. I checked immediately, running my tongue over every surface. Nothing missing, nothing loose.

I put the tooth in a sealed bag and called my dentist. She confirmed it was a human molar, adult, likely from someone older than me based on the wear patterns. She suggested I contact the police, which I did.

The detective I spoke to was thorough. They sent the tooth for DNA analysis. I gave a sample for elimination.

The results came back eleven days later. The tooth belonged to a woman. Age estimated between 55 and 70 at time of extraction. The extraction had been performed post-mortem.

The DNA matched no living person in any database. They cross-referenced it against missing persons, unidentified remains, cold cases. Nothing.

Nobody can explain how it got into my hand. My apartment was locked. There was no sign of entry.

I haven't been sleeping with my fists clenched since then. I sleep with my hands flat, on top of the covers, where I can see them.

Just in case.`,
  },

  // ── Haunted Places (5) ───────────────────────────────────────
  {
    categoryId: 5,
    title: 'The Library That Closes at Three',
    slug: 'the-library-that-closes-at-three',
    excerpt:
      'Harwick Public Library has a sign on the door: No entry after 3pm on Sundays. The staff will not say why.',
    coverImage: 'https://picsum.photos/seed/haunt2/800/400',
    content: `Harwick Public Library was built in 1931 and hasn't been significantly renovated since 1974. It smells the way good libraries should — old paper, wood polish, the particular mustiness of knowledge left undisturbed.

The sign on the front door has been there since at least the 1980s, according to locals. It reads, plainly: SUNDAYS: LIBRARY CLOSES AT 3:00PM. NO EXCEPTIONS.

Every other day, the library closes at six. On Saturdays, at five. Only on Sundays does it close three hours early, and only on Sundays does the head librarian — for as long as anyone can remember, a succession of head librarians — personally walk through every aisle at 2:45 to ensure all patrons have left.

A journalist from the local paper asked the current head librarian, a woman named Mrs Doyle, why the library closed early on Sundays.

"Policy," she said.

"Whose policy?"

"Longstanding policy."

"When was it introduced?"

Mrs Doyle looked at her for a long moment. "There was an incident," she said. "A long time ago. On a Sunday afternoon. We don't discuss it."

The journalist filed a freedom of information request. The library's incident records from before 1975 were listed as lost in a water damage event.

On a Sunday last autumn, a teenager hid in the bathroom until after closing time. His friends dared him to stay until four.

He was found outside the library at 3:07, sitting on the front steps, unable to explain how he had gotten there. He doesn't remember anything after 3:01.

He has not discussed what he saw.`,
  },
  {
    categoryId: 5,
    title: "The Hotel Room That Isn't on Any Floor",
    slug: 'the-hotel-room-that-isnt-on-any-floor',
    excerpt:
      'The Meridian Grand has 14 floors and 280 rooms. Guests have reported checking into room 1408 — a room that does not officially exist.',
    coverImage: 'https://picsum.photos/seed/haunt3/800/400',
    content: `The Meridian Grand Hotel opened in 1962 and has operated continuously since then. It has fourteen floors, a standard configuration, and according to its official room registry, 280 guest rooms numbered sequentially from 101 to 1420 — with one gap.

There is no room 1408.

The hotel's management has confirmed this when asked. Between rooms 1407 and 1409 there is a blank stretch of corridor wall. No door. The dimensions, if you measure the corridor, suggest a room of normal size should be there. The wall sounds hollow when knocked.

Across fifty years, the hotel has received at least eleven written complaints from guests who claimed to have stayed in room 1408. The complaints describe a normal hotel room — bed, bathroom, window — with one consistent detail: the window looked out onto a view that did not correspond to the hotel's actual location. Green fields, in several accounts. A road that no guest has been able to identify on any map.

The hotel's standard response to these complaints is to apologise for "any confusion regarding room numbering" and offer a complimentary night's stay.

A former front desk employee gave an interview to a paranormal podcast in 2020. She said that twice during her employment she had found a key card programmed for room 1408 in the key card machine — produced by the machine itself, without being requested. She threw both away without using them.

"Some doors," she said, "you shouldn't open even if you have the key."`,
  },

  // ── Ghost Encounters (6) ──────────────────────────────────────
  {
    categoryId: 6,
    title: "My Daughter's Imaginary Friend Left a Handprint",
    slug: 'my-daughters-imaginary-friend-left-a-handprint',
    excerpt:
      'Children have imaginary friends. I know this. But imaginary friends do not leave handprints on fogged glass.',
    coverImage: 'https://picsum.photos/seed/ghost2/800/400',
    content: `My daughter Petra started talking about Thomas when she was three. Thomas was her imaginary friend. He sat with her at meals, accompanied her to the park, and apparently had very specific opinions about which stories she should be read at bedtime.

I was not concerned. Imaginary friends are normal. My mother said I had one too.

The handprint appeared in February of the year Petra turned four. She had been in the bath and the mirror above the sink had fogged with steam. I went in to get her out and wrap her in a towel, and as the steam began to clear, I saw the print.

A child's handprint on the mirror. Five clear fingers, a palm, pressed flat against the glass.

Petra was in the bath, which was on the other side of the room. She could not have reached the mirror. The handprint was also smaller than Petra's hand — I pressed her palm against the glass beside it to compare. The print was from a child younger than her. Smaller fingers. Shorter reach.

"Thomas says hello," Petra said from the bath, without looking up from her rubber duck.

I took a photograph. I still have it. Clear as anything — two handprints side by side on a fogged mirror. My daughter's, which I put there for comparison.

And Thomas's.

Petra stopped mentioning Thomas shortly after she started school. She's eight now. Last week I asked her if she remembered him.

She looked at me seriously. "He went back," she said.

I didn't ask where.`,
  },
  {
    categoryId: 6,
    title: 'The Funeral Where the Wrong Person Was in the Coffin',
    slug: 'the-funeral-where-the-wrong-person-was-in-the-coffin',
    excerpt:
      "I went to my uncle's funeral on a Saturday. That Monday, he called me to ask how it went.",
    coverImage: 'https://picsum.photos/seed/ghost3/800/400',
    content: `I want to be precise about the facts because the facts are strange enough without embellishment.

My uncle Raymond died on a Thursday. Heart failure, age 71. My mother called me that evening. I drove up for the weekend.

The funeral was on a Saturday. Open casket. I stood at the front of the chapel with my cousins and we looked at my uncle Raymond lying in the coffin in his good suit. I touched his hand. It was cold, the way hands are cold when there is no longer anyone in them.

I gave a reading. We buried him. We went back to my aunt's house and ate sandwiches and talked about him the way people do when someone is newly gone.

That Monday morning, my phone rang. The number was my uncle Raymond's landline.

I answered.

"How did it go?" he said.

His voice. Exactly his voice, the slight rasp he'd had since he quit smoking, the way he always skipped hello and started talking.

I said his name.

"The funeral," he said. "Your mother said it was on Saturday. How did it go?"

I asked him — I don't know what I expected — I asked him where he was.

"Home," he said. "Where else would I be?"

I drove back up that afternoon. My aunt answered the door. She had been expecting me, she said. She looked exhausted in the specific way of someone who has stopped being surprised.

My uncle was in the kitchen. Alive. He had been in the hospital for a bypass operation and had come home that morning. There had been a miscommunication, a terrible administrative error at the funeral home. Another man, a stranger, had been buried in my uncle's place.

Raymond died two years later, properly. Of natural causes, in his own bed. I was with him.

I still don't know whose funeral I attended that Saturday. I'm not sure I want to.`,
  },

  // ── Crime and Mystery (7) ────────────────────────────────────
  {
    categoryId: 7,
    title: 'The Confession That Was Filed Before the Crime',
    slug: 'the-confession-that-was-filed-before-the-crime',
    excerpt:
      'A man walked into a police station and confessed to a murder. The body was found three days later.',
    coverImage: 'https://picsum.photos/seed/crime2/800/400',
    content: `On the fourteenth of April, 2003, a man named Dale Pruitt walked into the Marchfield Police Department and told the desk officer that he had murdered a woman named Carol Vess.

He provided her address. He described how he had done it. He told them where in the house her body would be found.

The duty sergeant dispatched a unit. The house was checked.

Carol Vess answered the door. She was alive and well and had no idea who Dale Pruitt was.

Pruitt was assessed by a mental health professional, found to be lucid but agitated, and released. He was not charged.

Three days later, Carol Vess was found dead in her home. The circumstances of her death matched, in significant detail, what Pruitt had described during his confession.

Pruitt was re-arrested immediately. His defence was straightforward: he had already confessed before the crime occurred.

He was convicted regardless. The jury deliberated for two days.

Pruitt maintained until his death in 2019 that he did not know Carol Vess and had never been to her house. He said he had dreamed about the murder the night before he went to the police — in enough detail that he had been certain it was real.

The case is studied in criminology programs as an example of the unreliability of confessions. It is studied in other places for entirely different reasons.`,
  },
  {
    categoryId: 7,
    title: 'The Map Found in the Walls',
    slug: 'the-map-found-in-the-walls',
    excerpt:
      "Renovating a Victorian terrace, the builders found a detailed hand-drawn map inside the walls. It showed tunnels beneath the city that don't appear on any official record — and one of them appears to run directly under the house.",
    coverImage: 'https://picsum.photos/seed/crime3/800/400',
    content: `The house on Aldgate Terrace was built in 1887 and had not been seriously renovated until it was purchased in 2017. The new owners, a couple named the Harmons, hired a local firm to gut the ground floor.

When the builders opened the wall between the kitchen and the scullery, they found, sandwiched between the laths, a roll of paper approximately forty centimetres wide and sixty centimetres long. It was yellowed but intact, preserved by the dryness of the void.

When unrolled, it proved to be a hand-drawn map. Detailed, precise, drawn with an engineer's care. It showed the streets of that part of the city — correctly, the Harmons confirmed, matching the current layout with only minor differences where old streets had been widened or renamed.

Below the streets, drawn in red ink, was a network of tunnels.

Some of these tunnels corresponded to known infrastructure — sewers, the underground railway, utility conduits. But the majority did not. They ran under private properties, under churches, under the foundations of civic buildings. They connected in ways that suggested deliberate design rather than utility.

One tunnel on the map ran directly beneath 14 Aldgate Terrace — the Harmons' house.

The local historical society had no record of the tunnels. The city archives had no record. The map's provenance could not be established.

The Harmons had the ground floor checked with surveying equipment.

Below the kitchen, at a depth of approximately four metres, there was a void. Long, narrow, running in exactly the direction indicated on the map.

They have not opened it.`,
  },

  // ── Missing Persons (8) ──────────────────────────────────────
  {
    categoryId: 8,
    title: 'The Boy Who Came Back Speaking a Different Language',
    slug: 'the-boy-who-came-back-speaking-a-different-language',
    excerpt:
      'Oliver was missing for eleven days. When he came back, he spoke no English. He had spoken nothing but English since birth.',
    coverImage: 'https://picsum.photos/seed/miss2/800/400',
    content: `Oliver Marsh was seven years old when he disappeared from his parents' back garden in rural Somerset on a Tuesday afternoon in June. The garden backed onto farmland. There was no gate, no road, nowhere obvious to go. He was there at two-fifteen. He was not there at two-thirty.

He was found eleven days later, sitting on the verge of a B-road twelve miles from his home, unharmed, clean, and well-fed. He was not distressed. He did not appear to have been through any ordeal.

He had no memory of where he had been.

What he did have was a language.

Not English. The family liaison officer who found him tried to speak to him and he responded fluently in something none of the attending officers recognised. He was not distressed; he seemed to find their failure to understand him merely puzzling, the way you might feel if everyone around you had simply forgotten a shared language.

A linguist was brought in within forty-eight hours. She listened to recordings for several hours before offering a tentative assessment: the language had structural similarities to Welsh, some phonological overlap with Cornish, but was consistent with neither. It contained sounds she had not encountered in any documented language.

Oliver recovered his English within three weeks, slowly, as if relearning something he had neglected for a long time.

He cannot reproduce the other language now. He says he doesn't remember it. But sometimes, when he is tired, he says words in his sleep that his mother doesn't recognise and can't find in any dictionary.

Oliver is twenty-three. He is studying linguistics at university. He says it was the obvious choice.`,
  },
  {
    categoryId: 8,
    title: 'Gone in the Grocery Store',
    slug: 'gone-in-the-grocery-store',
    excerpt:
      'I turned around for thirty seconds. My son was gone. The cameras showed him walking into an aisle and not coming out.',
    coverImage: 'https://picsum.photos/seed/miss3/800/400',
    content: `My son Elliot is fine. I want to start there. He came back. He is sitting in the next room right now watching television and I can hear him laughing and he is fine.

This happened when he was five. We were in the grocery store on a Thursday afternoon. He was in the cart. I was comparing two brands of pasta sauce and I put him down — the store was quiet, I could see clearly for forty metres in either direction, I put him down for thirty seconds.

When I turned back he was gone.

I searched the aisle. I called his name. I went to the front desk and they announced it over the PA. Every member of staff began searching. The security guard reviewed the camera footage immediately.

The camera for that aisle showed Elliot standing beside the cart, looking at something. He walked to the end of the aisle. He turned the corner.

The camera for the next aisle showed an empty aisle.

He did not appear on any other camera. He did not go toward the entrance. He did not go toward the back of the store. He walked around a corner and was not on the other side of it.

Elliot was found forty minutes later in the car park, sitting calmly beside our car. He said he had been waiting for me. He said a "nice man" had shown him where the car was.

There is no man on any camera. In the car park or elsewhere. Elliot described him as "tall with a grey coat." Nothing else. He stopped mentioning the man after a few weeks.

I still check his face every time I lose sight of him. Even now that he's twelve. Even now that he laughs at me for it.

I can't stop.`,
  },

  // ── Sleep Paralysis (9) ──────────────────────────────────────
  {
    categoryId: 9,
    title: 'The Same Figure in Three Countries',
    slug: 'the-same-figure-in-three-countries',
    excerpt:
      'I described my sleep paralysis figure to a woman I met in Tokyo. She went pale. She had seen the same one.',
    coverImage: 'https://picsum.photos/seed/sleep2/800/400',
    content: `I've had sleep paralysis episodes since I was about sixteen. The figure in mine is consistent: a tall, thin shape in the corner of the room, darker than the surrounding darkness, that moves toward the bed when it thinks I'm not watching.

I know it's a neurological event. I've read everything there is to read about hypnagogic hallucinations. I am not here to argue about what it is.

I'm here to tell you about the woman in Tokyo.

I was at a conference in 2018. Standard networking dinner, nothing remarkable. I was talking to a researcher from Osaka named Yuki about something completely unrelated to any of this when she mentioned sleep paralysis in passing — she was studying sleep disorders.

I mentioned I experienced it. She asked what I saw.

I described it: the corner figure, the way it moved only when peripheral, the specific sense of pressure it created before I woke fully.

She put down her glass.

"Where do you live?" she asked.

Edinburgh, I told her.

She took out her phone and showed me a sketch. She had drawn it herself, she said, years ago, trying to document her own experiences. A tall dark figure. In the corner. Moving at the edge of vision.

It was the same figure.

I have since found two other people — a man in São Paulo and a woman in Lagos — who describe the same entity in their paralysis episodes. Same height. Same movement pattern. Same corner.

Sleep paralysis is a documented neurological event. I know this.

I just want to know why we're all seeing the same thing.`,
  },
  {
    categoryId: 9,
    title: 'It Spoke This Time',
    slug: 'it-spoke-this-time',
    excerpt:
      "I've had sleep paralysis for ten years. The figure has never spoken before. Last week it did.",
    coverImage: 'https://picsum.photos/seed/sleep3/800/400',
    content: `Ten years. I've had sleep paralysis episodes for ten years. I know the routine: wake unable to move, figure in the corner or by the door, crushing weight on the chest, ten to ninety seconds, then release. I've learned not to panic. I breathe. I wait. It passes.

Last Tuesday it was different.

I woke at 3am. The usual paralysis. The usual figure — mine stands just inside the bedroom door, which I now leave open specifically because I find the darkness of the hallway behind it less disturbing than the closed-door alternative. The usual weight.

I was doing my breathing. Waiting it out. And then it stepped closer, which it has done before, and it leaned down, which it has done before, and it put what I can only describe as a face very close to mine.

And it spoke.

I could not tell you what language it was, or whether it was language at all. The sound it made was low, resonant, felt more in the chest than heard with the ears. It went on for what felt like a long time.

Then it straightened, stepped back to the door, and I could move.

I sat up and turned on the light and sat there until it was light outside.

Here is the thing. Here is the thing I cannot explain even by my own standards.

I understood it. I don't know how. I could not tell you what words it used. But I understood what it said.

It said: "Not yet."

I don't know what that means. I'm not sure I want to.`,
  },

  // ── Forest Tales (10) ───────────────────────────────────────
  {
    categoryId: 10,
    title: 'The Deer That Watched Us Camp',
    slug: 'the-deer-that-watched-us-camp',
    excerpt:
      'It stood at the edge of the firelight for three hours. It never moved. It never blinked.',
    coverImage: 'https://picsum.photos/seed/forest2/800/400',
    content: `We were four days into a camping trip in the national forest when the deer appeared.

It was the second night. We had a good fire going. One of us saw it first — at the edge of the firelight, at the tree line, standing completely still. A deer, average-sized, facing us.

We didn't think much of it initially. Deer come to fires sometimes, drawn by the light or the warmth or simple curiosity. We watched it for a while, then went back to talking.

An hour later, it was still there.

Still in exactly the same position. Not grazing. Not moving. Facing us.

We shone a torch at it. Its eyes caught the light — the usual reflective eye-shine. It didn't react. Didn't startle. Didn't turn away.

We went to bed. I woke once in the night and unzipped the tent to check the time by the fire.

The deer was still there.

Same position. Same stillness. Four hours after we'd first seen it.

In the morning it was gone. No tracks in the soft earth at the tree line. Not because anything had obscured them — the conditions were perfect for prints — but because there were simply no marks to indicate the animal had ever been there.

The forest ranger we spoke to at the trail head three days later listened to our description.

"Did it blink?" he asked.

We looked at each other. We didn't know. We didn't think so.

The ranger nodded. He said: "If you see it again, don't go toward it. Just wait for it to leave." He wouldn't say anything else.`,
  },
  {
    categoryId: 10,
    title: 'The Trail That Changed Overnight',
    slug: 'the-trail-that-changed-overnight',
    excerpt:
      'We hiked in on a clear marked trail. We camped. In the morning the trail behind us was gone.',
    coverImage: 'https://picsum.photos/seed/forest3/800/400',
    content: `We had been on the Greer Valley trail a dozen times. It's a well-maintained path, marked every quarter mile, maps available at the trail head. A six-hour return hike through mixed woodland to a viewpoint over the valley, then back the same way.

We camped at the halfway point, as we had done before. Set up tents, cooked, slept well.

In the morning, we packed up and turned to walk back down the trail.

The trail was not there.

Not overgrown, not obstructed. Simply not there. Where the path had been — the clear, worn, frequently-walked path with its regular markers — there was dense undisturbed undergrowth, as if no one had ever walked through.

We had compasses. We had phones with GPS. The GPS showed us in the correct location. It showed the trail. But the trail as shown on the GPS and the terrain we were standing in did not correspond.

We spent four hours trying to find a way back. Eventually we used the GPS to navigate cross-country, through actual forest, and came out on a logging road two miles from the trail head.

We reported it to the park authority. They sent rangers to the campsite location.

The rangers reported that the trail was exactly as it should be. All markers present. Path clear. No anomalies.

We have the GPS logs from that morning. They show us moving in a direct line through an area that, according to the same GPS, is occupied by a clearly marked trail. We moved through it for four hours.

We have never found an explanation. We have not been back.`,
  },

  // ── Night Shift Stories (11) ──────────────────────────────────
  {
    categoryId: 11,
    title: 'The Patient in Bay Four',
    slug: 'the-patient-in-bay-four',
    excerpt:
      'Bay four had been empty for a week. The monitors showed no patient. The nurses heard someone breathing.',
    coverImage: 'https://picsum.photos/seed/night2/800/400',
    content: `I've been an A&E nurse for fourteen years. I've worked nights for most of them. You develop a tolerance for strangeness — not indifference, just tolerance. The things you see become categorisable. Strange, yes, but usually strange in ways that have explanations, even if the explanations are themselves disturbing.

Bay four was different.

The bay had been cleared for a deep clean following an infectious case. It was due to be out of use for a week. Curtains drawn, equipment off, a sign on the frame indicating it was closed.

On the third night it was closed, at around 2am, one of the healthcare assistants came to find me. She said she could hear breathing in bay four.

I went to check. I stood outside the curtain and listened. She was right. Slow, rhythmic, the unmistakable sound of someone asleep or unconscious. I pulled back the curtain.

The bay was empty. Bed made up clean and flat, the way housekeeping leaves them.

But the monitor — which was powered off — had a reading on its screen. Heart rate: 62 beats per minute. Oxygen saturation: 98%. The cable that should have connected the monitor to a patient had no clip on the end. It connected to nothing. The readings updated every few seconds.

I documented it in the incident log. My supervisor looked at the log, looked at me, and said: "Which bay?"

I told her. She nodded and said: "We try not to put patients in four if we can help it."

She never explained why.`,
  },
  {
    categoryId: 11,
    title: "The Security Guard's Last Round",
    slug: 'the-security-guards-last-round',
    excerpt:
      'The office building had been empty for six months. The motion sensors still triggered every night at 3:15.',
    coverImage: 'https://picsum.photos/seed/night3/800/400',
    content: `The Prentiss Building had been vacant since the company that occupied it went into administration in the spring. My job was to make regular checks, monitor the alarm system, and ensure no vandals or squatters had gotten in.

The building was empty. I had done a full walk-through on my first night. Seven floors of empty offices, stripped desks, abandoned chairs, the particular echoing silence of a space that used to hold hundreds of people.

On my second week, I noticed the motion sensor pattern.

Every night, without exception, between 3:12 and 3:18am, the motion sensors on the fifth floor triggered in sequence. Not all at once — in sequence. Starting from the east stairwell, moving west along the corridor, ending at the corner office at the far end.

The same path, the same timing, every night.

I reviewed the camera footage. The corridor was empty. Whatever was triggering the sensors moved through the corridor without appearing on camera.

I walked the route myself one night. Counted it out. Whatever triggered those sensors moved at the pace of a person doing a relaxed walk. Pausing at the corner office for approximately forty-five seconds, then — nothing. The sensors went quiet.

I asked the building manager about the fifth floor. He told me, with some reluctance, that the previous head of security — a man named Gerald — had done his final round on the fifth floor on the night he died. Cardiac arrest, alone in the building. That was three years before I started.

Gerald had done his rounds at 3:15.`,
  },

  // ── Strange Phone Calls (12) ──────────────────────────────────
  {
    categoryId: 12,
    title: 'The Call From My Own Number',
    slug: 'the-call-from-my-own-number',
    excerpt: 'My phone rang. The caller ID showed my own number. I answered it. I heard myself.',
    coverImage: 'https://picsum.photos/seed/phone2/800/400',
    content: `I want to say upfront that I've looked into every technical explanation for this and none of them fully account for what happened.

It was a Monday morning. I was in my car, about to drive to work. My phone rang. The caller ID showed my own mobile number — the same number, digit for digit.

I've heard of spoofing. I answered it cautiously.

The voice on the other end was mine.

Not similar to mine. Not distorted or slightly off. Mine. The exact cadence, the specific way I drop certain consonants, a slight breathiness I've always had on my long vowels. A voice that sounded like someone had recorded me talking and was playing it back.

It said: "Don't take the motorway this morning."

Then it hung up.

I sat in the car for a while. Then I took the A-road.

There was a serious accident on the motorway that morning. A multi-vehicle collision at junction 7, which is precisely the junction I would have joined at, at precisely the time I would have been there. Three people were hospitalised.

I have never been able to explain this. Spoofing cannot replicate your voice. I have no history of sleepwalking or fugue states. I have not received a call from my own number before or since.

I don't know who called me. I don't know how they knew. I just know that I take the A-road now, always, without exception, every single morning.`,
  },
  {
    categoryId: 12,
    title: 'The Automated Call About the Accident',
    slug: 'the-automated-call-about-the-accident',
    excerpt:
      "I received an automated call from my insurance company regarding my accident. I hadn't been in an accident. Yet.",
    coverImage: 'https://picsum.photos/seed/phone3/800/400',
    content: `I received the call on a Thursday at half past eleven in the morning. An automated voice — the kind that sounds almost but not quite human, the telltale flatness of text-to-speech — identifying itself as calling from my car insurance provider regarding "the incident on 14th November."

The date was the 12th of November.

The automated voice asked me to confirm my policy number and provide an initial account of the incident "for the purposes of the claim I had submitted." I had submitted no claim. There had been no incident.

I hung up and called my insurance provider directly. They had no record of any call going out to my number. They had no claim filed under my policy. They had no incident on record. They confirmed their automated system does not make proactive calls of that nature.

On the 14th of November — two days later — I was involved in a minor collision. A car ran a red light and clipped my front bumper in a car park. Nobody was hurt. Minor damage. I filed a claim.

The claim reference number they gave me matched a partial number the automated voice had recited two days earlier.

I have the original call in my phone log. The number it came from traces to my insurance provider's call centre. They have no record of it originating from their systems.

The claim went through without issue. When I mentioned the earlier call to my claims handler she said: "That does happen sometimes."

She didn't explain what she meant. She moved on very quickly.

I didn't push it.`,
  },

  // ── Creature Sightings (13) ───────────────────────────────────
  {
    categoryId: 13,
    title: 'The Thing Beneath the Ice',
    slug: 'the-thing-beneath-the-ice',
    excerpt:
      'The lake froze over in January. We could see something moving beneath the ice. It was too large to be anything we knew.',
    coverImage: 'https://picsum.photos/seed/creature2/800/400',
    content: `Greer Lake freezes solid most winters. It's a popular spot for ice fishing in January and February — the ice gets thick enough to drive a snowmobile across safely.

The winter I'm describing, four of us were out on the ice early on a Saturday morning. Clear sky, good visibility, about minus twelve. We had drilled our holes and were settling in when one of us noticed the shadow beneath the ice.

At first we thought it was a large fish. Pike can grow substantial in that lake. But the shadow was too large for a pike, too large for any freshwater fish native to that region. It was moving slowly, following the underside of the ice, and it was long — our best estimate was somewhere between four and six metres.

It circled us. Not erratically. Deliberately.

The ice is clear when it freezes cleanly, and this was a clean freeze. We could see the shape of the thing below us, though not clearly enough to identify it. The body was cylindrical. It didn't seem to have distinct fins in the way a large fish would.

It stayed below us for about twenty minutes, then moved away toward the deeper part of the lake and disappeared.

We packed up and left.

The lake authority, when contacted, said there were no species in the lake capable of reaching that size. They suggested we had seen a large log displaced by current.

There is no current in a frozen lake.

None of us have been back. Two of us moved away from the area the following year. It might be coincidence. I'd like to believe it's coincidence.`,
  },
  {
    categoryId: 13,
    title: 'The Figure in the Field at Harvest',
    slug: 'the-figure-in-the-field-at-harvest',
    excerpt:
      "Every harvest season, for twenty years, the same figure has appeared at the edge of my family's field at dusk. We have never been able to get closer than fifty metres before it disappears.",
    coverImage: 'https://picsum.photos/seed/creature3/800/400',
    content: `My family has farmed the same land for four generations. The field I'm talking about is the eastern pasture — sixty acres of flat ground that borders a small wood on the far side.

The figure first appeared in the autumn of my father's third year working the land after his own father retired. He didn't tell anyone for a long time.

He told us at dinner one autumn evening when I was about twelve. He'd seen it again that afternoon — at dusk, at the edge of the wood, standing still. Tall, he said. Too tall. With proportions that weren't quite right in a way he found difficult to articulate.

We had teased him, initially. Then my older brother saw it the following year.

Then I saw it the year after.

We have attempted to get closer on multiple occasions. The figure is always at the wood's edge, about fifty metres away. When we move toward it, it doesn't run — it's simply gone. No movement, no rustling of undergrowth. Gone.

It appears only at harvest time. Only at dusk. Only in the eastern pasture.

My father consulted the local history archive and found a reference in a nineteenth-century farm journal to a similar figure appearing at the same location at harvest time. The journal author believed it was a spirit tied to the land. He wrote that his grandfather had seen it too.

We don't discuss it with people outside the family. We've come to think of it as a feature of the land, like the drainage problems in the lower field or the way the east gate sticks in wet weather.

It's just there. It's been there longer than we have.`,
  },

  // ── Abandoned Places (14) ─────────────────────────────────────
  {
    categoryId: 14,
    title: 'The Photographs in the Abandoned House',
    slug: 'the-photographs-in-the-abandoned-house',
    excerpt:
      "Every room in the abandoned house was empty — except one, which was full of photographs of people sleeping. None of them knew they'd been photographed.",
    coverImage: 'https://picsum.photos/seed/abandon2/800/400',
    content: `I explore abandoned buildings. I know the risks, I take the precautions, I don't need the lecture. What I want to tell you about is the house on the Old Croft Road.

It had been empty for at least fifteen years by the time I went in. Standard residential, three bedrooms, completely stripped of furniture. Damp, structurally sound enough to navigate, nothing unusual about the ground floor or first floor.

The second bedroom on the first floor was different.

The walls were covered in photographs. Not professional prints — these were photographs printed on standard paper, the kind you'd print from a home printer, slightly faded, taped to the walls with what had once been clear tape and had now gone yellow with age.

The photographs were all of people sleeping. Dozens of them. Adults and children, elderly people and teenagers. Different beds, different rooms, different houses. Different people entirely from each photograph to the next.

The subjects were all photographed from above, slightly to the side — from the angle of someone standing at the bedside, leaning over, very close.

None of the people appeared to know they were being photographed.

There was a wooden chair positioned in the centre of the room, facing the wall. A single photograph had been placed on the seat of the chair, face down. I turned it over.

It was a photograph of me. Asleep in my own bed.

The timestamp on the print in the corner was from eleven days before I entered that house.

I left immediately. I called the police. The house was searched. They found the room as I described it and took the photographs as evidence.

They have never identified who took them or how the photographer gained access to the homes.

My locks were changed that afternoon. They have not found them yet.`,
  },
  {
    categoryId: 14,
    title: 'The Church That Never Closed',
    slug: 'the-church-that-never-closed',
    excerpt:
      'The Church of St Aldric was deconsecrated in 1971. Nobody told whoever is still holding services there.',
    coverImage: 'https://picsum.photos/seed/abandon3/800/400',
    content: `The Church of St Aldric sits at the end of a lane outside the village of Petworth Cross, surrounded by a graveyard that stopped receiving new residents in 1969. It was deconsecrated in 1971 and has been privately owned since 1983.

I photographed it in the autumn as part of a project on rural ecclesiastical buildings.

The door was unlocked. This is common with old rural churches — the locks fail and nobody fixes them. I went inside.

The interior was in better condition than I'd expected. Pews intact and dusted. Candles lit on the altar — not burnt-down, actually lit, the flames moving in the draught from the door I'd opened. A vase of fresh flowers on the altar table, white roses, recently arranged.

A service booklet on each pew. I picked one up. Printed on standard white paper, no date, a complete order of service for Evensong.

The pages were not dusty. The flowers were not wilting. The candles had not been burning long enough to drip.

I left and drove to the village, where I asked at the pub whether anyone used the old church.

The landlord looked at me carefully.

"It's always been like that," he said. "Flowers on Monday, candles when you get there on Tuesdays, Evensong booklets on Thursdays. It's been that way since before I was born."

I asked who put them there.

"Nobody knows," he said. "People have tried to catch whoever it is. There's nobody."

I drove back to photograph the interior again. The candles had burned down. The flowers were already wilting. Whatever keeps that church prepared for a service that never quite happens had gone until the following week.`,
  },

  // ── Psychological Drama (15) ─────────────────────────────────
  {
    categoryId: 15,
    title: "I Keep Finding Notes I Don't Remember Writing",
    slug: 'i-keep-finding-notes-i-dont-remember-writing',
    excerpt:
      'Post-it notes in my handwriting, in my home, describing things I was about to do before I did them. Always waiting for me. Always accurate.',
    coverImage: 'https://picsum.photos/seed/psych2/800/400',
    content: `It started small. A post-it note on the bathroom mirror: "Out of toothpaste." I was out of toothpaste. I didn't remember writing it.

I assumed I'd written it some time ago and forgotten. This happens. You leave yourself reminders and then the reminder becomes the new normal and you forget you left it.

Then I found one on my keyboard at work: "Cancel the 3 o'clock." I had, at that moment, been about to cancel the 3 o'clock. The note was in my handwriting.

My colleague at the next desk said she hadn't put it there. There was nobody else in the office who used my desk.

Over the following three weeks I found eleven notes. All in my handwriting. All accurately describing things I was about to do, about to say, or about to discover. "Wrong exit" written on my steering wheel before a journey I hadn't yet planned. "Don't eat the fish" on a restaurant menu I hadn't opened. "She already knows" before a conversation I hadn't anticipated.

I went to my doctor. She referred me to a psychiatrist. The psychiatrist diagnosed dissociative episodes and suggested I was writing the notes during periods I wasn't consciously aware of.

The notes stopped for two months. I completed a course of therapy. I was doing well.

Last Tuesday I arrived home and found a note on my front door. My handwriting.

"This is the last one. You're ready now."

I don't know what I'm ready for. I'm not sure I want to find out.`,
  },
  {
    categoryId: 15,
    title: "My Therapist Doesn't Exist",
    slug: 'my-therapist-doesnt-exist',
    excerpt:
      'I saw my therapist every Tuesday for eight months. Then I tried to refer a friend to her and discovered her practice had never been registered.',
    coverImage: 'https://picsum.photos/seed/psych3/800/400',
    content: `I want to write this down while it still makes sense to me, while I can still put the events in order. I am not sure how much longer I will be able to do that.

I began seeing a therapist — I will call her Dr M — following my father's death last year. A colleague had recommended her. I attended every Tuesday at six o'clock for eight months. The sessions took place in a consulting room on the fourth floor of a building on Cavendish Street. I paid by bank transfer. I made progress. Real progress, the kind you notice in daily life.

When a friend was struggling, I wanted to refer her to Dr M. I looked for the practice registration number to give her — therapists must be registered, it's a legal requirement.

I could not find Dr M in any professional register.

I called the building management on Cavendish Street. They told me the fourth floor had been under renovation for eighteen months and was not occupied by any practice.

My bank records show eight months of identical transfers. To an account I cannot trace.

I have session notes in my own handwriting spanning those eight months. I have a confirmed improvement in my general mental health corroborated by friends and family.

I have memories of Dr M that are clear and consistent. Her voice, her office, the view from the window — a view that, if the fourth floor is under renovation, I should not have been able to see.

My GP has no referral record on file. My colleague who recommended Dr M has no memory of doing so.

I don't know who I was talking to on those Tuesdays. I don't know where I was. And I don't know what frightens me more: the possibility that someone was impersonating a therapist for eight months, or the possibility that those sessions happened somewhere I cannot explain.

I am better than I was. Whatever that means.`,
  },

  // ── Supernatural Events (16) ──────────────────────────────────
  {
    categoryId: 16,
    title: 'The Rain That Fell Upward',
    slug: 'the-rain-that-fell-upward',
    excerpt:
      'For eleven minutes on a Thursday afternoon, the rain over our street fell upward. Forty-three residents witnessed it. Meteorology has no explanation.',
    coverImage: 'https://picsum.photos/seed/super2/800/400',
    content: `I want to be clear that this account is corroborated by forty-two other people and was reported to the local meteorological office, to a university physics department, and to the local authority. None of them provided a satisfactory explanation.

It was a Thursday afternoon in late October. I was standing at my kitchen window watching a heavy rainstorm when I noticed the rain on the street outside was not behaving normally. The drops were not falling. They were rising — from the pavement, from the gutters, from puddles that were reconstituting themselves into droplets and lifting upward.

The rain falling from the clouds above was still falling. There were two simultaneous rain events: normal rain coming down, and inverted rain rising up. They passed through each other.

I went outside, umbrella up, and stood in it. The drops from below were cold and real. They soaked the underside of my umbrella. My shoes were wet from below as thoroughly as my umbrella was wet from above.

My neighbours were out too. We stood in the street looking up and then down.

It lasted eleven minutes. Then the rising rain slowed, the drops seemed to hang in the air for a moment, and then they fell normally back to the ground.

The meteorological office called it an atmospheric anomaly caused by localised pressure inversions. The physics professor I corresponded with was more honest: he said he had no mechanism to offer and that what I described should not be possible.

I have video. The video has been viewed extensively and no manipulation has been identified.

It happened. I don't know why. I'm not sure knowing why would make me feel better.`,
  },
  {
    categoryId: 16,
    title: 'The Night All the Clocks Ran Backwards',
    slug: 'the-night-all-the-clocks-ran-backwards',
    excerpt:
      "We lost four hours we cannot account for. Every clock in the town ran backwards. The dogs didn't stop barking until dawn.",
    coverImage: 'https://picsum.photos/seed/super3/800/400',
    content: `It is difficult to describe an event that, by its nature, disrupted the very mechanism we use to sequence events. I'll do my best.

It happened in March. I went to bed at eleven. I know this because I checked my phone — the time was 23:04 — and put it on the nightstand face up, as I always do.

I woke to the dogs barking. Both of them, simultaneously, in a continuous agitated bark that they maintain only when something is genuinely wrong. I reached for my phone.

The time was 22:47.

I had gone to bed at eleven. My phone said it was ten forty-seven. I had gone backward in time by seventeen minutes.

I assumed a glitch. I reset the phone. It synchronised with the network and displayed: 22:47.

The dogs barked until 4am. In the morning, I spoke to my neighbours. They had experienced the same thing: waking in the night to find the time had rolled backward. Not everyone the same amount — some had lost twenty minutes, some had lost forty, one elderly man reported waking to find it was four hours earlier than when he had fallen asleep.

Every clock in the village. Digital, analogue, phone-synchronised. All of them. When we compared notes the next morning, we found a window of about four hours in the night during which the clocks had run backward.

The dogs had barked the entire time.

We filed a report with the regional government. It was logged as an "unexplained infrastructure anomaly." The file was later transferred to a department whose name we were not given.`,
  },

  // ── Creepy Folklore (17) ──────────────────────────────────────
  {
    categoryId: 17,
    title: 'The Festival You Must Not Attend Twice',
    slug: 'the-festival-you-must-not-attend-twice',
    excerpt:
      'The village holds a festival every ten years. Everyone is welcome to attend once. Nobody who attends twice is ever quite right afterwards.',
    coverImage: 'https://picsum.photos/seed/folk2/800/400',
    content: `In the highlands of a country I will not name, in a village small enough that you would not find it on a standard map, there is a festival that occurs every ten years at midsummer.

The festival is celebrated openly. There is food and music and dancing that goes on through the night. Visitors are welcome. The village encourages them. Tourism, such as it is, has been good for the community.

The only rule is that you may attend once.

This is explained to visitors when they arrive. Politely, straightforwardly, without drama: you are welcome to join us tonight, but please do not return for the next festival. The villagers themselves attend every decade, as they always have. Visitors come once.

A researcher who visited in the 1990s asked the village elder why visitors could not return.

The elder considered the question carefully. "Because the first time," she said, "you see what is on the surface. The dancing and the fire and the food. It is real and it is good and you should enjoy it. The second time, you would see what is underneath. And that is not for people from outside."

The researcher documented five cases of outsiders who had attended the festival twice, all from the previous century. Three of them left the village in a state of significant distress and required extended care afterwards. One refused to speak for the rest of his life. One wrote a manuscript describing what she had seen beneath the festival, then burned it.

The researcher attended the festival once. She described it as "the most beautiful thing I have ever experienced."

She has not returned.`,
  },
  {
    categoryId: 17,
    title: 'The Name You Must Not Say Before Sunrise',
    slug: 'the-name-you-must-not-say-before-sunrise',
    excerpt:
      "In my grandmother's village, every child was taught the name you must never say before the sun comes up. My cousin said it on a dare.",
    coverImage: 'https://picsum.photos/seed/folk3/800/400',
    content: `My grandmother came from a coastal fishing village in the north. She brought very little with her when she emigrated — some photographs, a small wooden box, and a rule.

The rule was simple: there is a word — a name — that you do not say aloud between midnight and sunrise. She would not tell us what the name was. She would not write it down. She said the name itself was not the issue; the issue was the attention that saying it attracted.

"It listens for its name," she said, in the matter-of-fact way she had of delivering information she considered practical rather than supernatural. "Say it in the dark and it comes to see who called it. Usually it only looks. But sometimes it stays."

We were children. We asked her what it was constantly. She never told us.

My cousin Marcus, when he was about sixteen and considered himself past the age of childish fears, found the name. I don't know how. He never told me his source. He said it on a dare at one in the morning at a family gathering.

I was in the room. I heard him say it.

Nothing happened immediately. We laughed. Marcus looked pleased with himself.

He changed over the following weeks. Not dramatically. Subtly. He slept more. He spoke less. He seemed to be attending to something the rest of us couldn't perceive — turning his head at sounds we couldn't hear, watching corners of rooms with an expression of careful attention.

My grandmother visited and sat with him for an hour. She told us afterwards that he would be alright but that he needed to stop engaging with it.

"It's been following him," she said. "He keeps looking back. If he stops looking, it will lose interest."

Marcus is fine now. He is forty-one. He does not look into corners anymore, or at least he tries not to.

We never found out what the name was. None of us have tried.`,
  },

  // ── Unsolved Mysteries (18) ───────────────────────────────────
  {
    categoryId: 18,
    title: 'The Town That Vanished Overnight',
    slug: 'the-town-that-vanished-overnight',
    excerpt:
      'In 1952, a town of 300 people was recorded in the census. By 1953, there was no record it had ever existed. The land was empty.',
    coverImage: 'https://picsum.photos/seed/unsolved2/800/400',
    content: `The town of Morrow's Landing appears in the 1952 regional census with a recorded population of 312 people. It is listed with a post office, a school with an enrollment of forty-seven children, two churches, and a railway halt.

It does not appear in the 1953 census. It does not appear on any map produced after 1952. The railway company has no record of the halt. The regional postal authority has no record of the post office.

Three historians have attempted to locate documentary evidence of Morrow's Landing: birth records, death certificates, land registry documents, church records. Two found nothing. The third — a Dr Helen Marsh, working in the mid-1980s — found one item: a single entry in a county surveyor's log from September 1953, reading only "Morrow's Landing inspection: nil findings. Site returned to common land per directive."

Per whose directive is not recorded.

Dr Marsh attempted to visit the location indicated in the 1952 census. She drove to the grid reference and found what she described as farmland without distinguishing features. She noted that the ground was unusually flat and that she found, half-buried at the edge of a field, a piece of masonry with what might have been a chimney bracket.

She applied for the directive referenced in the surveyor's log under freedom of information. Her application was acknowledged and then, over the course of several months, silently closed without response.

Dr Marsh died in 1991. Her research notes were donated to a university archive. When a student researcher requested them in 2019, she was informed that the box had been misfiled and could not be located.

Morrow's Landing has 312 people in one document and nothing in all the others. Nobody knows what happened. Nobody, apparently, is looking.`,
  },
  {
    categoryId: 18,
    title: 'The Signal From Nowhere',
    slug: 'the-signal-from-nowhere',
    excerpt:
      'In 1977, a radio telescope received a signal that has never been explained. In 2003, a different telescope received a response.',
    coverImage: 'https://picsum.photos/seed/unsolved3/800/400',
    content: `On the 15th of August, 1977, an astronomer named Jerry Ehman was reviewing data from a radio telescope survey when he circled an anomaly and wrote a single word in the margin: "Wow!"

The Wow! signal is a matter of historical record. A narrowband radio signal lasting 72 seconds, at a frequency consistent with what scientists had theorised an extraterrestrial intelligence might use for communication. It has never been satisfactorily explained and has never been heard again despite extensive efforts to detect a repeat.

What is less widely known — and what I spent three years trying to verify before writing this — is a series of events from 2003.

A small radio astronomy team in a country I will call Country X was conducting a routine survey. I have the name of the lead researcher but I have been asked not to publish it. In June of 2003, they detected a signal.

The signal originated from the same region of sky as the 1977 Wow! signal. It lasted 71 seconds — one second shorter. It was at the same frequency. Unlike the 1977 signal, it was not a pure tone. It contained structure. It was not random noise.

The team spent four months attempting to analyse the structure before reporting it. When they submitted their paper for peer review, they were contacted by a government agency, the name of which I have not been able to confirm, and asked not to publish.

The paper was withdrawn.

The lead researcher I spoke to said only this: "The 2003 signal was not random. Whether it was a response to 1977 or something else entirely, I cannot say. But it was structured. Someone put structure into it. I don't know who."

The 1977 signal remains officially unexplained. The 2003 signal does not officially exist.`,
  },
];

async function main() {
  console.log(`Seeding ${stories.length} stories...`);
  for (const story of stories) {
    await prisma.story.upsert({
      where: { slug: story.slug },
      update: {},
      create: { ...story, status: 'PUBLISHED', featured: false, authorId: AUTHOR_ID },
    });
    console.log(`  ✓ ${story.title}`);
  }
  console.log('\nDone!');
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
