// prisma/seed-stories-new.ts
// Adds eight original stories, each in a category that currently has none.
//
// Run with: npm run db:seed:stories:new
//
// Idempotent — a story whose slug already exists is skipped, so re-running is
// safe and never duplicates.
//
// WHY THESE CATEGORIES
// The homepage showcase hides categories with no published stories (see
// CategoriesShowcase). Fifty-two of the seventy-two were therefore invisible.
// Each story below fills a different empty one, so eight of them surface with
// real content rather than as dead tiles.
//
// Authorship: all eight are published under `the_keeper`, the existing system
// account used for every other seeded story. They are clearly house content, not
// impersonations of a real writer.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

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

type Seed = {
  slug: string;
  title: string;
  categorySlug: string;
  mood: 'CREEPY' | 'PARANOID' | 'DISTURBING' | 'ATMOSPHERIC' | 'PSYCHOLOGICAL' | 'SUPERNATURAL' | 'GORE' | 'JUMPSCARE' | 'DARK';
  contentRating: 'ALL' | 'TEEN' | 'MATURE';
  warnings?: string[];
  excerpt: string;
  content: string;
};

const stories: Seed[] = [
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'the-camera-that-learned-to-wait',
    title: 'The Camera That Learned to Wait',
    categorySlug: 'surveillance-horror',
    mood: 'PARANOID',
    contentRating: 'TEEN',
    excerpt: 'The motion sensor triggered on an empty corridor. Then it stopped triggering, which was worse.',
    content: `<p>The building had nineteen cameras and I watched all of them, which is a way of saying I watched none of them. Nineteen grey rectangles, nineteen empty corridors, nine hours a night. You learn to see the shape of nothing happening. You learn it so well that the first time something does, you almost miss it.</p>
<p>Camera 12 covered the east stairwell between the third and fourth floors. It was motion-triggered, which meant it sat dark until something moved and then flared into life with a soft click I felt in my teeth. Most nights it clicked four times: the cleaner going up at eleven, the cleaner coming down at midnight, and twice more for the moths that got into the stairwell in summer.</p>
<p>On the fourteenth of March it clicked at 3:40 a.m. and showed me an empty stairwell.</p>
<p>I rewound. Nothing entered the frame. Nothing left it. The camera had simply decided, for eleven seconds, that something was moving, and then decided it had stopped.</p>
<p>I logged it as a fault. Faults are the most comfortable thing in my job, because a fault is a thing that can be fixed by somebody who is not me.</p>
<p>It happened again on the fifteenth, at 3:40. On the sixteenth, at 3:40. By the twentieth I was watching camera 12 for ten minutes either side of the hour, coffee going cold, and I had started to notice something that made the back of my neck feel loose.</p>
<p>The eleven seconds were always eleven seconds. But the framing was changing.</p>
<p>Not much. A degree, maybe two. The handrail crept a little further left across the bottom of the shot each night, the way the minute hand of a clock moves if you are willing to stare at it long enough to be sure. Something was turning the camera. Slowly. Patiently. In eleven-second increments, once a night, at 3:40 in the morning.</p>
<p>I worked out where it would be pointing in a fortnight. I did the arithmetic three times because I did not like the answer.</p>
<p>It would be pointing at the door to the security office.</p>
<p>I told my supervisor. He came in on a Tuesday, watched the recordings with his arms folded, and said the mount was loose and the building settles and the sensor was probably picking up the heating. He tightened the bracket himself with a screwdriver from his car and told me to get more sleep. He was not unkind about it. That is the part I keep coming back to. He was not unkind, and he was not stupid, and he simply could not see it, the way you cannot see a word you have stared at until it stops being a word.</p>
<p>The camera stopped clicking after that. Nine nights of nothing. I slept better. I stopped bringing the extra coffee.</p>
<p>On the tenth night I realised what the silence meant, and I have not been back to the building since.</p>
<p>It had stopped triggering because it had stopped needing to move.</p>
<p>It was already pointing where it wanted to point.</p>`,
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'marguerite-does-not-like-the-cupboard',
    title: 'Marguerite Does Not Like the Cupboard',
    categorySlug: 'haunted-dolls',
    mood: 'CREEPY',
    contentRating: 'TEEN',
    excerpt: 'My daughter named the doll before we told her its name. We had never told her its name.',
    content: `<p>The doll came with the house, in the way that damp and bad wiring come with a house. She was in the cupboard under the stairs when we did the survey, sitting upright on a shelf with her hands in her lap, and the surveyor made a joke about her that neither of us laughed at.</p>
<p>My wife wanted to bin her. I said she was probably Victorian and probably worth something, which was my way of saying I did not want to be the person who threw her away.</p>
<p>Ellie was four. Ellie found her before either of us had decided anything.</p>
<p>&ldquo;Marguerite doesn&rsquo;t like the cupboard,&rdquo; she said, at dinner, with the enormous seriousness of a child reporting a fact.</p>
<p>My wife put down her fork. We had not named the doll. We had not, as far as either of us could remember, called her anything but <em>the doll</em> or, once, in an argument, <em>that bloody thing</em>.</p>
<p>&ldquo;Who told you she&rsquo;s called Marguerite, sweetheart?&rdquo;</p>
<p>&ldquo;She did.&rdquo;</p>
<p>Children say things. That is the whole of childhood, saying things. We told each other this in the kitchen afterwards, quietly, in the voices people use when they are agreeing about something neither of them believes.</p>
<p>That night I took the doll out of Ellie&rsquo;s room and put her back in the cupboard and turned the little brass key in the lock. In the morning she was on the landing, facing Ellie&rsquo;s door. The cupboard was still locked. I checked it twice, and then I checked the key, which was where I had left it, on the hook by the fusebox, where a four-year-old could not reach.</p>
<p>I want to be clear about what happened next, because it is the part people always want me to exaggerate and I never do.</p>
<p>Nothing happened next. For three years, nothing happened.</p>
<p>Marguerite sat on the shelf in Ellie&rsquo;s room. Ellie talked to her the way children talk to anything with a face. We stopped noticing her, the way you stop noticing a picture you hang in a hallway. When Ellie was seven she asked for the shelf to be moved higher because Marguerite wanted to see out of the window, and I moved it, and I did not think about the sentence until I was halfway down the stairs.</p>
<p>The thing that ended it was so small.</p>
<p>Ellie came down one morning and asked, in an ordinary voice, over cereal, whether she was allowed to go in the cupboard under the stairs. I said of course, why. And she said: because Marguerite says it&rsquo;s my turn now.</p>
<p>We moved out in eleven days. The doll went in a skip in a different postcode, wrapped in a bin bag, under half a bathroom.</p>
<p>Ellie is nineteen now and remembers none of it, and I have never once asked her whether she is sure.</p>
<p>Because the house sold quickly, to a family with two young boys, and I stood in the driveway on the day we handed over the keys and I did not say a single word about the cupboard, and I have had eleven years to decide what that makes me.</p>`,
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'forty-one-days-in-the-register',
    title: 'Forty-One Days in the Register',
    categorySlug: 'missing-persons',
    mood: 'DARK',
    contentRating: 'TEEN',
    excerpt: 'The mountain lodge required every guest to sign out. For forty-one days, someone had signed in and never signed out.',
    content: `<p>The Bridehollow Lodge keeps a register because the mountain kills people who do not tell anyone where they have gone. You sign in with your name and your intended route. You sign out when you come back. If you do not sign out by nine in the evening, somebody with a radio starts making calls, and if you turn up alive afterwards you buy that person a drink and take the ribbing.</p>
<p>It has worked since 1963. It is a good system, because it is a stupid system, and stupid systems do not fail in clever ways.</p>
<p>I took over as warden in the September. Part of the handover was the register, four decades of it, in identical black ledgers on a shelf behind the desk. Marta showed me how to run the evening check: finger down the in-column, finger down the out-column, anything unmatched gets a phone call.</p>
<p>&ldquo;And this,&rdquo; she said, and turned to a page near the back of the 1994 book, and put her finger on a line, and did not say anything else for a while.</p>
<p><em>D. Aylward. Corrie path, returning via the saddle.</em> Signed in at 07:15 on the eleventh of April.</p>
<p>No signature in the out-column.</p>
<p>&ldquo;They never found him?&rdquo;</p>
<p>&ldquo;They found him,&rdquo; Marta said. &ldquo;That&rsquo;s not the thing.&rdquo;</p>
<p>She turned the page. The twelfth of April: <em>D. Aylward. Corrie path, returning via the saddle.</em> 07:15. No sign-out.</p>
<p>The thirteenth. The fourteenth. The same nine words in the same small careful hand, the same time to the minute, every morning for forty-one days.</p>
<p>&ldquo;They found him on the twelfth,&rdquo; Marta said. &ldquo;Below the corrie. He&rsquo;d been dead since the eleventh — they were certain, there was weather in between, it wasn&rsquo;t ambiguous. The mountain rescue log and the coroner both say the eleventh.&rdquo;</p>
<p>&ldquo;Then who was signing?&rdquo;</p>
<p>She closed the book. &ldquo;That&rsquo;s the question everyone asks, and it&rsquo;s the wrong one. Handwriting analysis said it was his. Three separate people watched the desk overnight in the last week of it and nobody saw anyone sign anything, and in the morning there was a new line. So the question isn&rsquo;t who.&rdquo;</p>
<p>&ldquo;Then what is it?&rdquo;</p>
<p>&ldquo;It stopped on the twenty-second of May,&rdquo; she said. &ldquo;Forty-one days. Nobody knows why it started and nobody knows why it stopped, and in thirty years nobody has worked out what happened on the twenty-second of May that was any different from the twenty-first.&rdquo;</p>
<p>She put the ledger back on the shelf, in order, between 1993 and 1995.</p>
<p>&ldquo;The question,&rdquo; she said, &ldquo;is what he was doing for forty-one days that needed him to keep telling us where he&rsquo;d gone. And whether he finished.&rdquo;</p>
<p>I have been warden for six years. I run the check every evening at nine. I have never found an unmatched line.</p>
<p>I check twice.</p>`,
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'track-eleven',
    title: 'Track Eleven',
    categorySlug: 'cursed-media',
    mood: 'ATMOSPHERIC',
    contentRating: 'TEEN',
    excerpt: 'The album has ten tracks. Every pressing, every format, every country. Ask anyone who owns one about track eleven.',
    content: `<p>I collect dead formats. Minidiscs, DCC, eight-track, the brief unhappy life of the DataPlay disc. It is a hobby for people who like objects more than they like music, and I say that as someone who owns four hundred of them.</p>
<p>The record is <em>Low Country</em> by an English folk duo who released it in 1978, sold perhaps nine hundred copies, and separated the following year. It has ten tracks. I want to be precise about this because everything else I am going to say depends on it. The sleeve lists ten. The label lists ten. The master tapes, which are in a climate-controlled room in Wapping and which I have held in my own hands, contain ten.</p>
<p>In 2011 a man in Ghent posted on a forum asking whether anyone else&rsquo;s copy had an eleventh.</p>
<p>He was mocked, gently, in the way forums do. He posted a rip. It was ten tracks. He apologised, said he must have been half asleep, and that was that for about four years.</p>
<p>Then a woman in Portland asked the same question, in almost the same words, and somebody remembered the Ghent thread and dug it up, and the tone changed.</p>
<p>Here is what the accounts agree on, and there are now, by my count, thirty-one of them.</p>
<p>It happens on a first listen, and only ever on a first listen, and only ever at night. Track ten ends. There is the ordinary gap. Then there is a track that is not on the sleeve, and it runs for somewhere between six and nine minutes, and it is the same piece every time: a woman singing without accompaniment, in English, quite clearly, a song nobody has ever been able to identify.</p>
<p>Nobody can tell you the words afterwards. Everyone is certain they understood them at the time.</p>
<p>And nobody has ever recorded it. Not once, in fourteen years. People have set up phones, tape decks, whole interfaces, laptops running capture software with the drive spinning — and the recordings run to the end of track ten and then to silence and then to the click of the mechanism stopping. Two people have had someone else in the room. Both times the other person heard nothing and watched them listen to nothing for eight minutes.</p>
<p>I bought a sealed copy in 2019 from a house clearance in Norfolk. I did all of it properly. Phone on the shelf, laptop capturing, my brother-in-law in the armchair with a book, one in the morning, curtains open.</p>
<p>Track ten ended. The gap came. And then the needle went on into the run-out groove with that soft repeating tick, and my brother-in-law turned a page, and nothing happened at all.</p>
<p>I have thought about that a great deal in the six years since. About what it means to be one of the ones it does not happen to. Whether there is a quality the thirty-one of them share and I lack, or one I have and they do not.</p>
<p>Whether it is a gift.</p>
<p>Whether it is a summons, and I was not called.</p>`,
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'the-neighbour-who-counts',
    title: 'The Neighbour Who Counts',
    categorySlug: 'paranoia',
    mood: 'PSYCHOLOGICAL',
    contentRating: 'TEEN',
    excerpt: 'He stands at his window at seven every evening, and his lips move, and I have finally worked out what he is counting.',
    content: `<p>I am going to set this down plainly, because when I say it out loud it sounds like something a person says shortly before they are taken somewhere, and I would like there to be a version on paper that does not have my voice shaking in it.</p>
<p>The man at number 41 stands at his front window every evening at seven. He has done this for the eleven months I have lived here. He does not look at anything. He faces the street, and his hands are at his sides, and his lips move.</p>
<p>For the first three months I did not notice. For the next three I noticed and did not think about it, which is a different thing. People are strange in small ways. My own mother tapped door frames.</p>
<p>In February I was walking back from the shop and I passed close enough to see his mouth clearly under the streetlight, and I understood that he was counting. Not talking. Counting — the small flat repetitions of a person going through numbers.</p>
<p>After that I could not stop.</p>
<p>I timed him. Four minutes, roughly, give or take twenty seconds. I counted my own numbers at what looked like his pace and got to somewhere near six hundred. I did this on eleven evenings and got results between five hundred and eighty and six hundred and forty, which is close enough to be the same number.</p>
<p>Six hundred of what?</p>
<p>I want you to understand that I tried the ordinary answers first. I am not a stupid man. Breathing exercises. Prayer. A tic. Grief — a wife, maybe, six hundred days, though the arithmetic there never came out anywhere meaningful. I tried them all and I discarded them all for the same reason, which is the thing I noticed in April and which I have not been able to unnotice since.</p>
<p>The number is going down.</p>
<p>In February it took him four minutes and ten seconds. In April it was three minutes fifty. In August it was three minutes twelve. Last Tuesday I stood at my own window with a stopwatch like a lunatic and it was two minutes and forty-one seconds.</p>
<p>He is not counting up to something. He is counting down. And the rate is steady enough that I have been able to draw the line on graph paper, which I did on a Sunday afternoon with the curtains closed, and the line reaches zero in the second week of November.</p>
<p>I have knocked. He does not answer the door at seven, and at any other hour he is perfectly ordinary — a nod at the bins, a comment about the weather. I have asked, once, obliquely, whether he was all right in the evenings. He said he was very well, thank you, and asked after my knee, which I had mentioned once in March and which he had remembered.</p>
<p>That was the worst of it, if I am honest. That he remembered my knee.</p>
<p>Because a man who is losing his mind does not remember your knee. A man who remembers your knee is a man in full possession of himself, standing at a window every evening, counting down to something, on purpose.</p>
<p>It is the ninth of November.</p>
<p>Last night it took him one minute and six seconds, and when he had finished, for the first time in eleven months, he looked up.</p>`,
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'soundings',
    title: 'Soundings',
    categorySlug: 'sea-monsters',
    mood: 'ATMOSPHERIC',
    contentRating: 'TEEN',
    excerpt: 'The seabed was charted at ninety metres. The echo sounder read ninety metres. Then it read forty. Then it read forty again, nine miles later.',
    content: `<p>An echo sounder is an honest instrument. It sends a pulse down, it listens for the pulse coming back, and it does arithmetic that a child could check. It does not have opinions. When people talk about the sea being unknowable they are being romantic; the sea is extremely knowable, and we have known most of it for a hundred years, and the charts are very good.</p>
<p>The Dunmarra Deep is charted at ninety-one metres for eleven miles along the shelf edge. It has been charted at ninety-one metres since 1911. It is a boring, well-behaved piece of water and we ran survey lines across it for six weeks without a single interesting thing happening.</p>
<p>On the twenty-third the sounder read forty-three metres.</p>
<p>That is not a small error. That is half the water column simply not being there. Ellis was on the desk and he did what anyone would do, which was to assume the instrument had faulted, and he logged it and reset it and it read ninety-one again and we carried on.</p>
<p>Nine miles further along the line, at 14:20, it read forty-three metres again.</p>
<p>The same number. Not forty-one, not forty-six. Forty-three, twice, nine miles apart, on a seabed that does not change by more than a metre in eleven miles.</p>
<p>Ellis stopped assuming it was the instrument at that point. So did I.</p>
<p>We ran the line again in the opposite direction. Nothing. We ran it a third time and got forty-three metres at a position two miles from either of the first two, and by then it was getting dark and nobody had said the obvious thing out loud yet, so I said it, because I was the senior scientist and it was my job to say things.</p>
<p>I said: the seabed has not risen. Something is between us and it.</p>
<p>You have to understand the size of what that means. The sounder does not see a fish. It does not see a whale unless you are almost unlucky enough to hit it. The beam at that depth covers a footprint you could park a bus in, and to register as a floor — flat, continuous, forty-three metres down for the eleven seconds it takes to cross — the thing returning the pulse has to be broad, and level, and hold that shape while we pass over it.</p>
<p>We did the arithmetic on the back of a printout, four of us round the chart table, checking each other. The shortest defensible answer was a hundred and ten metres across.</p>
<p>Ellis asked whether we should tell anyone.</p>
<p>I have thought about that question every day for nineteen years, and I will tell you what I told him then, which is that the recordings were unambiguous and the methodology was sound and we had three independent traces, and we reported none of it. We wrote up the survey with the two anomalies logged as instrument fault, and we signed it, and I have never been able to explain to my own satisfaction why.</p>
<p>Except that we were not frightened, exactly. Not on the boat, with the deck lights on and the tea going round.</p>
<p>We were frightened of the water afterwards, on the way home, when there were no instruments at all and only the ordinary black sea going past, and no way at all of knowing what was forty-three metres beneath us.</p>`,
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'the-ledger-of-mercy-bright',
    title: 'The Ledger of Mercy Bright',
    categorySlug: 'victorian-horror',
    mood: 'DISTURBING',
    contentRating: 'MATURE',
    warnings: ['Death of a child (historical, off-page)', 'Institutional cruelty'],
    excerpt: 'The workhouse ledger recorded every child admitted and every child discharged. The numbers balanced perfectly, which was the problem.',
    content: `<p>The Salford Union workhouse kept its books the way all such places kept their books, which is to say meticulously and without mercy. Admissions on the left. Discharges on the right. Deaths in a third column, narrow, ruled in red, as though the width of the column were a comment on how often it was expected to be needed.</p>
<p>I was engaged in 1974 by the county archive to catalogue eleven boxes of such ledgers, and I was, at the time, a young man who believed that history was a thing that had finished happening.</p>
<p>The hand belonging to Mercy Bright, matron between 1868 and 1881, is beautiful. That is the first thing anyone notices. Copperplate of the kind they beat into girls, every letter identical, the pressure never varying, the columns ruled by eye and true to the millimetre. Thirteen years of it without a blot.</p>
<p>Her books balance. Every child in is a child out — discharged to a relative, apprenticed to a trade, transferred to another Union, or entered in the red column. Four hundred and six children pass through her ledgers in thirteen years and every one of them is accounted for.</p>
<p>This is remarkable. I did not know how remarkable until I had done the other ten boxes.</p>
<p>Every other matron and master in that archive loses children. Not to death — to the ordinary chaos of a system moving the poor around like freight. Names entered twice. Names entered and never resolved. A boy admitted in March who simply stops being mentioned. Across the other ten boxes I counted a hundred and ninety-one such discontinuities and thought nothing of them, because they are the texture of the thing. Paperwork is bad. People are busy. Children run away.</p>
<p>Mercy Bright lost none. Not one, in thirteen years.</p>
<p>I want to say that I noticed this and was troubled. In truth I noticed it and was <em>pleased</em>, in the small proprietorial way of a cataloguer who has found a tidy box, and I wrote a note commending her records to the county archivist, and I moved on to box nine.</p>
<p>It was the apprenticeships that undid it. Forty-one children in thirteen years are recorded as apprenticed to a Mr. J. Vaughan, cordwainer, of Pendleton. Forty-one is a great many for one small shoemaker, but the entries are perfectly formed and the addresses consistent and there is a signature each time in a second hand.</p>
<p>There was no cordwainer named Vaughan in Pendleton. There was no Vaughan in Pendleton at all. I checked the trade directories for every year between 1868 and 1881, and then the parish registers, and then, because by that stage I could not stop, the census returns for 1871 and 1881 street by street.</p>
<p>Forty-one children left the Salford Union to be apprenticed to a man who did not exist, and the ledgers balanced, and because the ledgers balanced nobody in a hundred and six years had ever had cause to look.</p>
<p>I reported it. There was an inquiry of sorts, which is to say two letters and a paragraph in a journal nobody reads. There is no one to prosecute. There is no one to tell. The forty-one have no descendants to inform because they had no descendants, and their names are the only thing anyone will ever have of them, and I have them, in a list, in a drawer.</p>
<p>I read them sometimes. It seems the least that is owed.</p>
<p>What I cannot get past — what I have not got past in fifty-one years — is the handwriting. Because a woman doing something in a panic writes like a woman in a panic. And Mercy Bright wrote those forty-one entries in the same beautiful, level, unhurried hand she used for the coal accounts.</p>
<p>She was not hiding anything. She was keeping records.</p>`,
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'autosave',
    title: 'Autosave',
    categorySlug: 'digital-hauntings',
    mood: 'SUPERNATURAL',
    contentRating: 'TEEN',
    excerpt: 'My father died in March. In August his laptop saved a document.',
    content: `<p>My father was not a sentimental man and he did not leave a letter, which I have decided to stop being angry about roughly once a month for two years.</p>
<p>What he left was a Dell laptop from about 2016, a charger with electrical tape round the neck, and a folder on the desktop called <strong>ADMIN</strong> containing four hundred files with names like <em>boiler2019.pdf</em>. He was a retired quantity surveyor. His hard drive was the tidiest thing he owned.</p>
<p>He died on the ninth of March. I did not open the laptop until the twenty-eighth, and then only to find the insurance policy, and then I closed it and put it in the spare room because I found I could not look at the way he had organised his folders without something happening in my chest.</p>
<p>In August I needed the boiler warranty. I plugged it in and sat on the floor of the spare room and waited through eleven minutes of Windows updates.</p>
<p>There was a file on the desktop that had not been there in March.</p>
<p>It was called <em>notes.docx</em>, which was not how he named things — he would have called it <em>notes2024.docx</em>, he would have put the year on, he put the year on everything. And the modified date was the eleventh of June.</p>
<p>I want to be careful here, because I have had two years to talk myself out of this and I have not managed it.</p>
<p>The laptop was in a drawer in the spare room from the twenty-eighth of March until the nineteenth of August. It was not plugged in. Its battery was, when I plugged it in, entirely flat — it would not power on for several minutes. Nobody else has a key to this flat. There is no cloud sync configured on that machine; I checked, at length, with someone who does this for a living, and he confirmed the account was local and the sync services were switched off and had been for years.</p>
<p>The file was eleven kilobytes. It opened.</p>
<p>It was a list of things that needed doing to the flat. The gutter above the kitchen window. The stopcock, which sticks, and which you have to turn the wrong way first. The name of the man who services the boiler and the fact that he prefers to be called in September rather than October. Where the deeds are. Which of the two keys on the ring opens the shed.</p>
<p>Twenty-two items. All of them true. All of them things I did not know, and three of them things I would have found out expensively.</p>
<p>It is not in his voice, particularly. It is not in anyone&rsquo;s voice. It is a list, in the flat register of a man who spent forty years writing specifications, and there is no address at the top and no name at the bottom and nothing anywhere in it that says goodbye.</p>
<p>The IT man had explanations. Windows creating temp files. A clock error making an old file look new. Something I did in March while grieving and do not remember. I have considered all of them properly, and any one of them might be true, and I notice I do not believe any of them, and I notice that I am not troubled by the fact that I do not believe them.</p>
<p>Because I have thought about what it would mean if it were him, and the answer is not frightening at all.</p>
<p>The answer is that my father, who could not say a single soft thing in fifty-eight years, came back in June and told me about the gutter.</p>`,
  },
];

async function main() {
  const keeper = await prisma.user.findUnique({
    where: { username: 'the_keeper' },
    select: { id: true },
  });
  if (!keeper) {
    console.error('System author "the_keeper" not found. Run `npm run db:seed` first.');
    process.exit(1);
  }

  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const bySlug = new Map(categories.map((c) => [c.slug, c.id]));

  let created = 0;
  let skipped = 0;

  for (const s of stories) {
    const categoryId = bySlug.get(s.categorySlug);
    if (!categoryId) {
      console.warn(`  ! category "${s.categorySlug}" not found — skipping "${s.title}"`);
      skipped++;
      continue;
    }

    // Idempotent: a slug that already exists is left exactly as it is.
    const existing = await prisma.story.findFirst({ where: { slug: s.slug }, select: { id: true } });
    if (existing) {
      console.warn(`  · already exists: "${s.title}"`);
      skipped++;
      continue;
    }

    await prisma.story.create({
      data: {
        title: s.title,
        slug: s.slug,
        excerpt: s.excerpt,
        content: s.content,
        status: 'PUBLISHED',
        authorId: keeper.id,
        categoryId,
        mood: s.mood,
        contentRating: s.contentRating,
        // warnings is a JSON-encoded string[] — same shape the story form writes.
        warnings: s.warnings ? JSON.stringify(s.warnings) : null,
        coverImage: `https://picsum.photos/seed/${s.slug}/800/400`,
      },
    });

    console.warn(`  ✓ [${s.categorySlug}] ${s.title}`);
    created++;
  }

  console.warn(`\n${created} created, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
