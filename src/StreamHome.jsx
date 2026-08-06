import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildRows, heroGames, searchGames } from './streamRows';
import './stream.css';

const HERO_INTERVAL_MS = 7000;

/* Covers are all 1:1 and come straight from jsDelivr at full size (some are
 * over 1MB). Declaring the box up front keeps CLS at zero, and lazy+async
 * decoding keeps offscreen rows off the main thread. */
const CARD_PX = 320;

function StarIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.75L12 16.9l-5.2 2.7 1-5.75-4.2-4.1 5.8-.85z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.3-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z" />
    </svg>
  );
}

function ChevronIcon({ dir }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  );
}

/* A title-card stand-in for art that fails to load. Hue is derived from the
 * title so a given game always gets the same colour. */
function FallbackArt({ title }) {
  const hue = useMemo(() => {
    let h = 0;
    for (let i = 0; i < title.length; i += 1) h = (h * 31 + title.charCodeAt(i)) % 360;
    return h;
  }, [title]);
  return (
    <div
      className="sx-card__fallback"
      style={{ '--fb-hue': hue }}
      aria-hidden="true"
    >
      <span>{title}</span>
    </div>
  );
}

function GameCard({ game, onPlay, isFavorite, onToggleFavorite, rank }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`sx-card${rank ? ' sx-card--ranked' : ''}`}>
      {rank ? <span className="sx-card__rank" aria-hidden="true">{rank}</span> : null}
      <div className="sx-card__body">
        <button
          type="button"
          className="sx-card__hit"
          onClick={() => onPlay(game)}
          aria-label={`Play ${game.title}`}
        >
          <div className="sx-card__art">
            {failed || !game.image ? (
              <FallbackArt title={game.title} />
            ) : (
              <img
                src={game.image}
                alt=""
                width={CARD_PX}
                height={CARD_PX}
                loading="lazy"
                decoding="async"
                onError={() => setFailed(true)}
              />
            )}
            <span className="sx-card__play" aria-hidden="true"><PlayIcon /></span>
          </div>
          <span className="sx-card__title">{game.title}</span>
        </button>
        <button
          type="button"
          className={`sx-card__fav${isFavorite ? ' is-on' : ''}`}
          onClick={() => onToggleFavorite(game.id)}
          aria-label={isFavorite ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`}
          aria-pressed={isFavorite}
        >
          <StarIcon filled={isFavorite} />
        </button>
      </div>
    </div>
  );
}

function Row({ row, onPlay, favoriteIds, onToggleFavorite }) {
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const syncEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft >= max - 4 });
  }, []);

  useEffect(() => {
    syncEdges();
  }, [syncEdges, row.games]);

  const nudge = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: 'smooth' });
  };

  const isTop10 = row.kind === 'top10';

  return (
    <section className={`sx-row${isTop10 ? ' sx-row--top10' : ''}`} aria-labelledby={`row-${row.id}`}>
      <header className="sx-row__head">
        <h2 id={`row-${row.id}`}>{row.title}</h2>
        {row.blurb ? <p className="sx-row__blurb">{row.blurb}</p> : null}
      </header>

      <div className="sx-row__viewport">
        <button
          type="button"
          className="sx-row__arrow sx-row__arrow--left"
          onClick={() => nudge(-1)}
          disabled={edges.start}
          aria-label={`Scroll ${row.title} left`}
        >
          <ChevronIcon dir="left" />
        </button>

        <ul className="sx-row__track" ref={trackRef} onScroll={syncEdges}>
          {row.games.map((game, i) => (
            <li key={`${row.id}-${game.id}`}>
              <GameCard
                game={game}
                onPlay={onPlay}
                isFavorite={favoriteIds.includes(game.id)}
                onToggleFavorite={onToggleFavorite}
                rank={isTop10 ? i + 1 : null}
              />
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="sx-row__arrow sx-row__arrow--right"
          onClick={() => nudge(1)}
          disabled={edges.end}
          aria-label={`Scroll ${row.title} right`}
        >
          <ChevronIcon dir="right" />
        </button>
      </div>
    </section>
  );
}

function Hero({ games, onPlay, reduceMotion }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const game = games[index];

  useEffect(() => {
    if (reduceMotion || paused || games.length < 2) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % games.length), HERO_INTERVAL_MS);
    return () => clearInterval(t);
  }, [reduceMotion, paused, games.length]);

  if (!game) return null;

  return (
    <section
      className="sx-hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured games"
    >
      {/* Source art is square, so the cinematic backdrop is a blown-up blurred
          copy of the same image. It is a static filter (not backdrop-filter),
          so it rasterises once instead of every frame. */}
      <div className="sx-hero__bg" aria-hidden="true">
        <img src={game.image} alt="" key={game.id} decoding="async" />
      </div>
      <div className="sx-hero__scrim" aria-hidden="true" />

      <div className="sx-hero__inner">
        <div className="sx-hero__art">
          <img src={game.image} alt="" width="220" height="220" decoding="async" />
        </div>
        <div className="sx-hero__copy">
          <p className="sx-hero__eyebrow">Featured</p>
          <h1 className="sx-hero__title">{game.title}</h1>
          {game.description ? <p className="sx-hero__desc">{game.description}</p> : null}
          <div className="sx-hero__actions">
            <button type="button" className="sx-btn sx-btn--primary" onClick={() => onPlay(game)}>
              <PlayIcon /> Play now
            </button>
            <span className="sx-hero__genres">{game.genres.join(' · ')}</span>
          </div>
        </div>
      </div>

      {games.length > 1 && (
        <div className="sx-hero__dots" role="tablist" aria-label="Featured games">
          {games.map((g, i) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={g.title}
              className={`sx-hero__dot${i === index ? ' is-active' : ''}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SearchResults({ query, onPlay, favoriteIds, onToggleFavorite }) {
  const results = useMemo(() => searchGames(query), [query]);

  if (!results.length) {
    return (
      <div className="sx-empty" role="status">
        <h2>No games match “{query.trim()}”</h2>
        <p>Try a shorter word, or check the spelling.</p>
      </div>
    );
  }

  return (
    <section className="sx-results" aria-label={`Search results for ${query}`}>
      <header className="sx-row__head">
        <h2>{results.length} result{results.length === 1 ? '' : 's'} for “{query.trim()}”</h2>
      </header>
      <ul className="sx-grid">
        {results.map((game) => (
          <li key={game.id}>
            <GameCard
              game={game}
              onPlay={onPlay}
              isFavorite={favoriteIds.includes(game.id)}
              onToggleFavorite={onToggleFavorite}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function StreamHome({
  onPlay,
  favoriteIds = [],
  onToggleFavorite,
  searchQuery = '',
  playCounts = {},
  reduceMotion = false,
}) {
  const rows = useMemo(
    () => buildRows({ favoriteIds, playCounts }),
    [favoriteIds, playCounts],
  );

  if (searchQuery.trim()) {
    return (
      <div className="sx-home">
        <SearchResults
          query={searchQuery}
          onPlay={onPlay}
          favoriteIds={favoriteIds}
          onToggleFavorite={onToggleFavorite}
        />
      </div>
    );
  }

  return (
    <div className="sx-home">
      <Hero games={heroGames} onPlay={onPlay} reduceMotion={reduceMotion} />
      <div className="sx-rows">
        {rows.map((row) => (
          <Row
            key={row.id}
            row={row}
            onPlay={onPlay}
            favoriteIds={favoriteIds}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
}
