/*
 * Builds library.json, the single game list the app renders.
 *
 * Primary source is games/gnmath.json + games/gnports.json: every cover and
 * game URL there is an absolute jsDelivr link, all verified live and all 1:1.
 *
 * games.json is kept as a fallback. Its images mostly point at
 * mathematics-lessons.eclipsecastellon.com, which now 404s on every asset path
 * and serves no working TLS, so those entries are flagged artDead and are not
 * shown in the artwork-driven rows. They stay in the file so nothing is lost.
 *
 * Genres are derived from titles because no source has category data (all 450
 * legacy entries are literally tagged "Arcade"). GENRE_RULES is ordered most
 * specific first. Hand-edit a game's genres in library.json and rerun with
 * --keep-overrides to preserve the edit.
 *
 * Usage: node scripts/build-library.mjs [--keep-overrides]
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const DEAD_ART_HOST = 'mathematics-lessons.eclipsecastellon.com';

/* Ordered most specific first. A title collects every rule it matches into
 * `genres`; the first match is treated as primary.
 *
 * Patterns run against the NORMALIZED title (lowercased, punctuation collapsed
 * to single spaces), so never write punctuation into a pattern -- ".io" arrives
 * here as "io" and "1v1.lol" as "1v1 lol". Nouns need explicit s? because these
 * lists are full of plurals ("Awesome Tanks", "Crazy Cars", "Advance Wars"). */
const GENRE_RULES = [
  ['Horror', /fnaf|five nights|freddy|granny|slender|scary|horror|creepy|nightmare|backrooms|poppy|huggy|siren head|dark deception|baldi|piggy|bendy|buckshot roulette|dead|zombie|evil|murder|killer|escape the/],
  ['Rhythm', /friday night funkin|\bfnf\b|rhythm|beat banger|piano|magic tiles|\bosu\b|dance|guitar|incredibox|sprunki|\bmusic\b|\bbeat\b/],
  ['Sandbox', /minecraft|terraria|sandbox|melon playground|people playground|\bcrafts?\b|\bbuilds?\b|buildnow|roblox|\bvoxel\b/],
  // \bsurviv\b, not bare "surviv" -- the latter swallows every "Survival" title.
  ['.io', /\bio\b|\bgg\b|agar|slither|krunker|shell shockers|bonk|diep|moomoo|\bsurviv\b|venge|zombs|1v1|blockpost|multiplayer/],
  ['Tower Defense', /tower defense|bloons|\btds?\b|defense|defence|defender|kingdom rush|plants vs/],
  ['Sports', /basketball|basket|soccer|football|\bgolf\b|\bpools?\b|bowling|tennis|baseball|hockey|boxing|dunks?|goalkeeper|penalty|rugby|cricket|volleyball|skates?|surf|\bbmx\b|olympic|sports?|retro bowl|\bnfl\b|\bnba\b|\bfifa\b|rocket league|\bpongs?\b|\bballs?\b|slides?/],
  ['Racing', /\braces?\b|racing|drift|\bcars?\b|\bkarts?\b|moto|\bbikes?\b|drives?\b|driving|traffic|highway|parking|trucks?|rally|formula|hill climb|madalin|stunts?|\btaxis?\b|burnout|\brush\b|\brockets?\b|speed/],
  ['Shooter', /shoots?|shooter|\bguns?\b|sniper|\bwars?\b|combat|strikes?|commando|bullets?|\btanks?\b|army|soldiers?|\bswat\b|blitz|gunspin|masked forces|bazooka|cannons?|bowmasters?|\bblast\b|\bshot\b/],
  ['Fighting', /fights?|fighting|battles?|brawls?|kombat|street fighter|ragdolls?|stickman|\bstick\b|smash|duels?|gladiator|\bufc\b|wrestl|karate|ninjas?|\bvikings?\b|\bclash\b/],
  ['Platformer', /mario|sonic|\bjumps?\b|jumping|platform|\bvex\b|fireboy|watergirl|geometry dash|\bsuper\b|\bworlds?\b|\bbros\b|adventures?|cat ninja|\bruns?\b|runner|temple|subway surf|celeste|\bcaves?\b|\btowers?\b|climb|\bboys?\b|bacon/],
  ['Puzzle', /puzzles?|2048|sudoku|tetris|matchs?|merges?|\bcubes?\b|sokoban|mahjong|crossword|\bwords?\b|quiz|brain|logic|solitaire|minesweeper|hexa|jigsaw|connects?|\bflow\b|blockudoku|wordle|\bblocks?\b|\bsort\b|\bcrush\b|amaze|\bmazes?\b|bloxorz|candy|\bcolors?\b|\blines?\b/],
  ['Strategy', /strategy|chess|checkers|\brisk\b|civilization|empires?|kingdoms?|castles?|conquer|tactics?|command|advance wars|ages of conflict|\bwars?\b/],
  ['Idle', /\bidle\b|clickers?|tycoons?|simulator|\bsim\b|factory|capitalist|incremental|cookie clicker|\bfarms?\b|evolution|\bbitlife\b|dimensions?|unlocked|\bshops?\b|\bmoney\b/],
  ['Card & Board', /\bcards?\b|poker|blackjack|\buno\b|monopoly|\bboard\b|domino|bingo|\bludo\b|backgammon|\bslots?\b|casino|balatro|roulette|carrom/],
  ['Classic', /pac man|\bsnakes?\b|breakout|space invaders|galaga|asteroids|frogger|retro|classic|atari|\bdooms?\b|wolfenstein|\bnes\b|\bgba\b|gameboy|emulator|\bflash\b|angry birds|\bpico\b/],
];

/* Titles that keyword matching genuinely cannot reach. Exact match on the
 * normalized title. Cheaper and more honest than bending the regexes until
 * they overfit and start mislabelling everything else. */
const TITLE_OVERRIDES = {
  'binding of issac wrath of the lamb': ['Roguelike', 'Shooter'],
  'baldurs gate': ['Strategy'],
  'cave story': ['Platformer'],
  'celeste': ['Platformer'],
  'celeste pico': ['Platformer'],
  'alien hominid': ['Shooter'],
  'altered beast': ['Fighting', 'Classic'],
  'awesome tanks': ['Shooter'],
  'awesome tanks 2': ['Shooter'],
  'bitplanes': ['Shooter'],
  'burrito bison': ['Arcade'],
  'bouncemasters': ['Arcade'],
  'attack hole': ['Arcade'],
  'coreball': ['Puzzle'],
  'circloo': ['Puzzle'],
  'circloo 2': ['Puzzle'],
  'cluster rush': ['Platformer'],
  'choppy orc': ['Fighting'],
  'blade ball': ['Fighting', 'Sports'],
  'bad parenting 1': ['Horror'],
  'class of 09': ['Horror'],
  'abandoned': ['Horror'],
  'amoprhous': ['Shooter'],
  'achiles': ['Fighting'],
  'aviamasters': ['Arcade'],
  'bank robbery 2': ['Puzzle'],
  'bob the robber 2': ['Platformer'],
  'bust a loop': ['Puzzle'],
  'buster jam': ['Arcade'],
  'apes vs helium': ['Arcade'],
  '99 balls': ['Arcade'],
  '13': ['Horror'],
  '1 date danger': ['Horror'],
  '10 minutes till dawn': ['Shooter'],
};

const DEFAULT_GENRE = 'Arcade';

const normalizeTitle = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const tagGenres = (title) => {
  const key = normalizeTitle(title);
  if (TITLE_OVERRIDES[key]) return TITLE_OVERRIDES[key];
  const haystack = ` ${key} `;
  const hits = GENRE_RULES.filter(([, re]) => re.test(haystack)).map(([name]) => name);
  // Three-plus genres means the title tripped a bunch of generic nouns and the
  // tags are noise rather than signal. Keep the two most specific (rules are
  // ordered specific-first) so rows stay meaningful.
  return hits.length ? hits.slice(0, 2) : [DEFAULT_GENRE];
};

const isDeadArt = (url) => typeof url === 'string' && url.includes(DEAD_ART_HOST);

const slugify = (t) => normalizeTitle(t).replace(/ /g, '-').slice(0, 60);

/* --- load sources ------------------------------------------------------- */

const primaryEntries = [
  ...readJson('games/gnmath.json').map((g) => ({ ...g, source: 'gnmath' })),
  ...readJson('games/gnports.json').map((g) => ({ ...g, source: 'gnports' })),
].map((g) => ({
  title: String(g.name || '').trim(),
  image: g.cover,
  url: g.url,
  source: g.source,
  artDead: false,
}));

const legacyEntries = readJson('games.json').map((g) => ({
  title: String(g.title || '').trim(),
  image: g.game_image_icon,
  url: g.url,
  description: g.description || '',
  source: 'legacy',
  legacyFeatured: Boolean(g.featured),
  artDead: isDeadArt(g.game_image_icon),
}));

/* --- merge: primary wins, legacy fills gaps ----------------------------- */

const byKey = new Map();
let duplicates = 0;

for (const entry of [...primaryEntries, ...legacyEntries]) {
  const key = normalizeTitle(entry.title);
  if (!key || !entry.url) continue;
  if (byKey.has(key)) {
    // Primary is inserted first, so an existing key means this is a legacy
    // duplicate. Keep the live-art primary but inherit the human-written blurb.
    const kept = byKey.get(key);
    if (!kept.description && entry.description) kept.description = entry.description;
    if (entry.legacyFeatured) kept.legacyFeatured = true;
    duplicates += 1;
    continue;
  }
  byKey.set(key, { ...entry });
}

/* --- preserve hand edits ------------------------------------------------ */

const keepOverrides = process.argv.includes('--keep-overrides');
const overrides = new Map();
if (keepOverrides && existsSync(join(root, 'library.json'))) {
  for (const g of readJson('library.json')) {
    if (g.genresLocked) overrides.set(normalizeTitle(g.title), g.genres);
  }
}

/* --- build final records ------------------------------------------------ */

const library = [...byKey.values()].map((entry) => {
  const key = normalizeTitle(entry.title);
  const locked = overrides.get(key);
  return {
    id: `${entry.source}-${slugify(entry.title)}`,
    title: entry.title,
    image: entry.image,
    url: entry.url,
    genres: locked || tagGenres(entry.title),
    genresLocked: Boolean(locked),
    source: entry.source,
    artDead: entry.artDead,
    description: entry.description || '',
    featured: Boolean(entry.legacyFeatured),
  };
});

library.sort((a, b) => a.title.localeCompare(b.title));

writeFileSync(join(root, 'library.json'), `${JSON.stringify(library, null, 2)}\n`);

/* --- report ------------------------------------------------------------- */

const playable = library.filter((g) => !g.artDead);
const genreCounts = {};
for (const g of library) {
  for (const name of g.genres) genreCounts[name] = (genreCounts[name] || 0) + 1;
}

console.log(`library.json written: ${library.length} games`);
console.log(`  with live art : ${playable.length}`);
console.log(`  art dead      : ${library.length - playable.length} (legacy, hidden from art rows)`);
console.log(`  merged dupes  : ${duplicates}`);
console.log('\ngenre distribution:');
for (const [name, n] of Object.entries(genreCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${name}`);
}
const untagged = library.filter((g) => g.genres.length === 1 && g.genres[0] === DEFAULT_GENRE);
console.log(`\nfell through to "${DEFAULT_GENRE}": ${untagged.length} (${Math.round((untagged.length / library.length) * 100)}%)`);
console.log('sample:', untagged.slice(0, 12).map((g) => g.title).join(', '));
