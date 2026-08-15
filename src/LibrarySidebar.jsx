import { useEffect, useRef } from 'react';
import { genreList, artGames, legacyGames } from './streamRows';
import { sfx } from './uiSound';
import { LEGAL_NAV } from './legal';
import './LibrarySidebar.css';

const LIBRARIES = [
  { id: 'stream', label: 'Main library', hint: `${artGames.length} games` },
  { id: 'main', label: 'Extra games', hint: 'External set' },
  { id: 'second', label: 'Classic', hint: `${legacyGames.length} archived` },
];

export default function LibrarySidebar({ open, onClose, library, onSelectLibrary, onJumpToGenre, onOpenLegal }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    // Focus moves into the drawer so keyboard and screen reader users are not
    // left behind on the trigger button.
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className={`lsb${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <button type="button" className="lsb__scrim" onClick={onClose} tabIndex={open ? 0 : -1} aria-label="Close menu" />
      <aside
        className="lsb__panel"
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Browse"
      >
        <div className="lsb__head">
          <span className="lsb__brand">deblocked</span>
          <button type="button" className="lsb__close" onClick={() => { sfx.back(); onClose(); }} aria-label="Close menu">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
              strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <p className="lsb__label">Libraries</p>
        <ul className="lsb__list">
          {LIBRARIES.map((lib) => (
            <li key={lib.id}>
              <button
                type="button"
                className={`lsb__item${library === lib.id ? ' is-active' : ''}`}
                onClick={() => { sfx.select(); onSelectLibrary(lib.id); onClose(); }}
                onMouseEnter={() => sfx.hover()}
                aria-current={library === lib.id ? 'true' : undefined}
              >
                <span className="lsb__item-label">{lib.label}</span>
                <span className="lsb__item-hint">{lib.hint}</span>
              </button>
            </li>
          ))}
        </ul>

        {library === 'stream' && (
          <>
            <p className="lsb__label">Jump to</p>
            <ul className="lsb__chips">
              {genreList.map((genre) => (
                <li key={genre}>
                  <button
                    type="button"
                    className="lsb__chip"
                    onClick={() => { sfx.toggle(); onJumpToGenre(genre); onClose(); }}
                    onMouseEnter={() => sfx.hover()}
                  >
                    {genre === '.io' ? 'Multiplayer .io' : genre}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Policy links live at the foot of the drawer -- the only persistent
            chrome on a site whose home page is a full-bleed hero with no
            footer of its own. */}
        <nav className="lsb__legal" aria-label="Site policies">
          {LEGAL_NAV.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="lsb__legal-link"
              onClick={() => { sfx.toggle(); onOpenLegal?.(id); }}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>
    </div>
  );
}
