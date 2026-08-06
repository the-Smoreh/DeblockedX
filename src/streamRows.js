import libraryData from '../library.json';

export const PLAY_COUNTS_KEY = 'deblockedx-play-counts-v1';

/* library.json is sorted A-Z so it stays readable as a diff when the build
 * script reruns. Rendering it in that order would put every "3D ..." game in
 * the first row of every genre, so rows get a deterministic shuffle instead:
 * stable across reloads (no layout churn), but not alphabetical. */
const seededRank = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
};

const shuffled = (games) =>
  [...games].sort((a, b) => seededRank(a.id) - seededRank(b.id));

/* Games whose artwork host is gone cannot appear in art-driven rows -- a row of
 * broken images is worse than a shorter row. They stay reachable through search
 * and the Classic library so the old collection is not lost. */
export const artGames = libraryData.filter((g) => !g.artDead);
export const legacyGames = libraryData.filter((g) => g.artDead);
export const allGames = libraryData;

export const heroGames = shuffled(artGames.filter((g) => g.featured)).slice(0, 10);

const GENRE_ORDER = [
  'Platformer',
  'Racing',
  'Shooter',
  'Horror',
  'Rhythm',
  'Sports',
  'Puzzle',
  'Fighting',
  '.io',
  'Idle',
  'Sandbox',
  'Classic',
  'Tower Defense',
  'Strategy',
  'Card & Board',
  'Arcade',
];

const GENRE_BLURBS = {
  Platformer: 'Jump, climb, and fall a lot',
  Racing: 'Anything with wheels',
  Shooter: 'Point and click, aggressively',
  Horror: 'Play with the lights on',
  Rhythm: 'Hit the notes',
  Sports: 'Ball games and worse',
  Puzzle: 'For when you want to think',
  Fighting: 'Settle it properly',
  '.io': 'Everyone against everyone',
  Idle: 'Numbers that go up',
  Sandbox: 'Build whatever',
  Classic: 'The old stuff',
  'Tower Defense': 'Hold the line',
  Strategy: 'Slow and deliberate',
  'Card & Board': 'Cards, dice, and tables',
  Arcade: 'Everything else',
};

const MIN_ROW_SIZE = 8;
const MAX_ROW_SIZE = 30;

/* --- play counts, used for the Top 10 row ------------------------------- */

export function readPlayCounts() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PLAY_COUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function recordPlay(gameId) {
  if (typeof window === 'undefined' || !gameId) return readPlayCounts();
  const counts = readPlayCounts();
  counts[gameId] = (counts[gameId] || 0) + 1;
  try {
    window.localStorage.setItem(PLAY_COUNTS_KEY, JSON.stringify(counts));
  } catch {
    /* storage full or blocked; the count is a nicety, not worth failing over */
  }
  return counts;
}

/* --- row assembly -------------------------------------------------------- */

const byId = new Map(allGames.map((g) => [g.id, g]));

export function buildRows({ favoriteIds = [], playCounts = {} } = {}) {
  const rows = [];

  const favorites = favoriteIds.map((id) => byId.get(id)).filter(Boolean);
  if (favorites.length) {
    rows.push({ id: 'favorites', title: 'Your Favorites', kind: 'standard', games: favorites });
  }

  /* The Top 10 is the viewer's own play history, not an invented popularity
   * figure -- there is no analytics backend to derive a real one from. Until
   * there are enough plays to rank, show the hand-picked featured games and
   * label the row honestly. */
  const played = Object.entries(playCounts)
    .map(([id, n]) => ({ game: byId.get(id), n }))
    .filter((x) => x.game && !x.game.artDead)
    .sort((a, b) => b.n - a.n)
    .slice(0, 10)
    .map((x) => x.game);

  if (played.length >= 3) {
    rows.push({ id: 'top10', title: 'Your Top 10', kind: 'top10', games: played });
  } else if (heroGames.length >= 3) {
    rows.push({ id: 'top10', title: 'Picked For You', kind: 'top10', games: heroGames.slice(0, 10) });
  }

  const recentlyPlayed = Object.entries(playCounts)
    .map(([id]) => byId.get(id))
    .filter((g) => g && !g.artDead);
  if (recentlyPlayed.length >= 4) {
    rows.push({
      id: 'continue',
      title: 'Jump Back In',
      kind: 'standard',
      games: recentlyPlayed.slice(0, MAX_ROW_SIZE),
    });
  }

  for (const genre of GENRE_ORDER) {
    const games = shuffled(artGames.filter((g) => g.genres.includes(genre)));
    if (games.length < MIN_ROW_SIZE) continue;
    rows.push({
      id: `genre-${genre}`,
      title: genre === '.io' ? 'Multiplayer .io' : genre,
      blurb: GENRE_BLURBS[genre],
      kind: 'standard',
      games: games.slice(0, MAX_ROW_SIZE),
      genre,
    });
  }

  return rows;
}

export function searchGames(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return allGames
    .filter((g) => g.title.toLowerCase().includes(q))
    .sort((a, b) => {
      // Exact prefix matches first, then live art ahead of dead art.
      const ap = a.title.toLowerCase().startsWith(q) ? 0 : 1;
      const bp = b.title.toLowerCase().startsWith(q) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      if (a.artDead !== b.artDead) return a.artDead ? 1 : -1;
      return a.title.localeCompare(b.title);
    });
}

export const genreList = GENRE_ORDER.filter(
  (genre) => artGames.filter((g) => g.genres.includes(genre)).length >= MIN_ROW_SIZE,
);
