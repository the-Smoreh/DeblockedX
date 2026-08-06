import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildRows, heroGames, searchGames } from './streamRows';
import { sfx } from './uiSound';
import './stream.css';

const HERO_INTERVAL_MS = 8000;
const CARD_PX = 320;

function Icon({ d, size = 18, fill = false }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"
      fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const PATH = {
  play: 'M8 5.14v13.72a1 1 0 0 0 1.54.84l10.3-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z',
  info: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 11v5M12 8h.01',
  star: 'M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.75L12 16.9l-5.2 2.7 1-5.75-4.2-4.1 5.8-.85z',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12M18 6L6 18',
};

function FallbackArt({ title }) {
  const hue = useMemo(() => {
    let h = 0;
    for (let i = 0; i < title.length; i += 1) h = (h * 31 + title.charCodeAt(i)) % 360;
    return h;
  }, [title]);
  return (
    <div className="sx-card__fallback" style={{ '--fb-hue': hue }} aria-hidden="true">
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
          onClick={() => { sfx.select(); onPlay(game); }}
          onMouseEnter={() => sfx.hover()}
          aria-label={`Play ${game.title}`}
        >
          <div className="sx-card__art">
            {failed || !game.image ? (
              <FallbackArt title={game.title} />
            ) : (
              <img src={game.image} alt="" width={CARD_PX} height={CARD_PX}
                loading="lazy" decoding="async" onError={() => setFailed(true)} />
            )}
            <span className="sx-card__play" aria-hidden="true"><Icon d={PATH.play} fill /></span>
          </div>
          <span className="sx-card__title">{game.title}</span>
        </button>
        <button
          type="button"
          className={`sx-card__fav${isFavorite ? ' is-on' : ''}`}
          onClick={() => { sfx.toggle(); onToggleFavorite(game.id); }}
          aria-label={isFavorite ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`}
          aria-pressed={isFavorite}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"
            fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"><path d={PATH.star} /></svg>
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

  useEffect(() => { syncEdges(); }, [syncEdges, row.games]);

  const nudge = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    sfx.slide();
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: 'smooth' });
  };

  const isTop10 = row.kind === 'top10';

  return (
    <section className={`sx-row${isTop10 ? ' sx-row--top10' : ''}`} aria-labelledby={`row-${row.id}`}>
      <header className="sx-row__head">
        <h2 id={`row-${row.id}`}>{row.title}</h2>
      </header>
      <div className={`sx-row__viewport${edges.start ? '' : ' has-start'}${edges.end ? '' : ' has-end'}`}>
        <button type="button" className="sx-row__arrow sx-row__arrow--left"
          onClick={() => nudge(-1)} disabled={edges.start} aria-label={`Scroll ${row.title} left`}>
          <Icon d={PATH.left} size={20} />
        </button>
        <ul className="sx-row__track" ref={trackRef} onScroll={syncEdges}>
          {row.games.map((game, i) => (
            <li key={`${row.id}-${game.id}`}>
              <GameCard game={game} onPlay={onPlay} isFavorite={favoriteIds.includes(game.id)}
                onToggleFavorite={onToggleFavorite} rank={isTop10 ? i + 1 : null} />
            </li>
          ))}
        </ul>
        <button type="button" className="sx-row__arrow sx-row__arrow--right"
          onClick={() => nudge(1)} disabled={edges.end} aria-label={`Scroll ${row.title} right`}>
          <Icon d={PATH.right} size={20} />
        </button>
      </div>
    </section>
  );
}

function DetailSheet({ game, onClose, onPlay, isFavorite, onToggleFavorite }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sx-sheet" role="dialog" aria-modal="true" aria-label={game.title}>
      <button type="button" className="sx-sheet__scrim" onClick={onClose} aria-label="Close details" />
      <div className="sx-sheet__panel">
        <button type="button" className="sx-sheet__close" onClick={() => { sfx.back(); onClose(); }} aria-label="Close details">
          <Icon d={PATH.close} size={20} />
        </button>
        <div className="sx-sheet__art"><img src={game.image} alt="" decoding="async" /></div>
        <div className="sx-sheet__body">
          <h2>{game.title}</h2>
          <p className="sx-sheet__meta">{game.genres.join(' · ')}</p>
          {game.description ? <p className="sx-sheet__desc">{game.description}</p> : null}
          <div className="sx-sheet__actions">
            <button type="button" className="sx-btn sx-btn--primary"
              onClick={() => { sfx.select(); onPlay(game); }}>
              <Icon d={PATH.play} fill size={17} /> Play now
            </button>
            <button type="button" className="sx-btn sx-btn--ghost"
              onClick={() => { sfx.toggle(); onToggleFavorite(game.id); }} aria-pressed={isFavorite}>
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"
                fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"><path d={PATH.star} /></svg>
              {isFavorite ? 'In favorites' : 'Add to favorites'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero({ games, onPlay, onMoreInfo, reduceMotion }) {
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
      {/* Source art is 1:1, so the cinematic plate is built from two copies of
          it: a blown up blurred wash filling the frame, and a sharp copy held
          to the right and feathered into that wash. */}
      <div className="sx-hero__wash" aria-hidden="true">
        <img src={game.image} alt="" key={`w-${game.id}`} decoding="async" />
      </div>
      <div className="sx-hero__key" aria-hidden="true">
        <img src={game.image} alt="" key={`k-${game.id}`} decoding="async" />
      </div>
      <div className="sx-hero__scrim" aria-hidden="true" />

      <div className="sx-hero__inner">
        <h1 className="sx-hero__title">{game.title}</h1>
        <p className="sx-hero__meta">{game.genres.join(' · ')}</p>
        {game.description ? <p className="sx-hero__desc">{game.description}</p> : null}
        <div className="sx-hero__actions">
          <button type="button" className="sx-btn sx-btn--primary"
            onClick={() => { sfx.select(); onPlay(game); }} onMouseEnter={() => sfx.hover()}>
            <Icon d={PATH.play} fill size={17} /> Play now
          </button>
          <button type="button" className="sx-btn sx-btn--ghost"
            onClick={() => { sfx.toggle(); onMoreInfo(game); }} onMouseEnter={() => sfx.hover()}>
            <Icon d={PATH.info} size={17} /> More info
          </button>
        </div>
      </div>

      {games.length > 1 && (
        <div className="sx-hero__dots" role="tablist" aria-label="Featured games">
          {games.map((g, i) => (
            <button key={g.id} type="button" role="tab" aria-selected={i === index} aria-label={g.title}
              className={`sx-hero__dot${i === index ? ' is-active' : ''}`}
              onClick={() => { sfx.toggle(); setIndex(i); }} />
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
            <GameCard game={game} onPlay={onPlay} isFavorite={favoriteIds.includes(game.id)}
              onToggleFavorite={onToggleFavorite} />
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
  const [detail, setDetail] = useState(null);
  const rows = useMemo(() => buildRows({ favoriteIds, playCounts }), [favoriteIds, playCounts]);

  if (searchQuery.trim()) {
    return (
      <div className="sx-home sx-home--search">
        <SearchResults query={searchQuery} onPlay={onPlay} favoriteIds={favoriteIds}
          onToggleFavorite={onToggleFavorite} />
      </div>
    );
  }

  return (
    <div className="sx-home">
      <Hero games={heroGames} onPlay={onPlay} onMoreInfo={setDetail} reduceMotion={reduceMotion} />
      <div className="sx-rows">
        {rows.map((row) => (
          <Row key={row.id} row={row} onPlay={onPlay} favoriteIds={favoriteIds}
            onToggleFavorite={onToggleFavorite} />
        ))}
      </div>
      {detail && (
        <DetailSheet game={detail} onClose={() => setDetail(null)} onPlay={onPlay}
          isFavorite={favoriteIds.includes(detail.id)} onToggleFavorite={onToggleFavorite} />
      )}
    </div>
  );
}
