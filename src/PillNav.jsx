import { useEffect, useRef, useState } from 'react';
import './PillNav.css';

const ICONS = {
  games: 'M6 11h4M8 9v4M15 12h.01M18 10h.01M7 6h10a5 5 0 0 1 5 5v1a4 4 0 0 1-7 2.6L14 14h-4l-1 .6A4 4 0 0 1 2 12v-1a5 5 0 0 1 5-5z',
  minecraft: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM20 20l-4.2-4.2',
  bell: 'M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7M13.7 20a2 2 0 0 1-3.4 0',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-3-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
};

function Icon({ name, size = 17 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export default function PillNav({
  title = 'deblocked',
  tabs = [],
  activePage,
  onNavigate,
  showSearch = false,
  searchQuery = '',
  onSearchChange,
  onOpenSettings,
  onOpenAnnouncements,
  onOpenMenu,
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // A non-empty query must keep the field open across re-renders, otherwise
  // typing a character would collapse the input it was typed into.
  const expanded = searchOpen || Boolean(searchQuery);

  return (
    <header className="pn">
      <nav className="pn__pill" aria-label="Main">
        {onOpenMenu && (
          <button type="button" className="pn__icon-btn pn__menu" onClick={onOpenMenu} aria-label="Open browse menu">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        )}
        <span className="pn__brand">{title}</span>

        <div className="pn__tabs" role="tablist" aria-label="Pages">
          {tabs.map((tab) => (
            <button
              key={tab.page}
              type="button"
              role="tab"
              aria-selected={activePage === tab.page}
              className={`pn__tab${activePage === tab.page ? ' is-active' : ''}`}
              onClick={() => onNavigate?.(tab.page)}
            >
              <Icon name={tab.icon || 'games'} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="pn__actions">
          {showSearch && (
            <div className={`pn__search${expanded ? ' is-open' : ''}`}>
              <button
                type="button"
                className="pn__icon-btn"
                onClick={() => setSearchOpen((v) => !v)}
                aria-label={expanded ? 'Close search' : 'Search games'}
                aria-expanded={expanded}
              >
                <Icon name="search" />
              </button>
              <input
                ref={inputRef}
                type="search"
                className="pn__search-input"
                value={searchQuery}
                placeholder="Search games"
                aria-label="Search games"
                onChange={(e) => onSearchChange?.(e.target.value)}
                onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { onSearchChange?.(''); setSearchOpen(false); }
                }}
              />
            </div>
          )}

          <button type="button" className="pn__icon-btn" onClick={onOpenAnnouncements} aria-label="Open announcements">
            <Icon name="bell" />
          </button>
          <button type="button" className="pn__icon-btn" onClick={onOpenSettings} aria-label="Open settings">
            <Icon name="settings" />
          </button>
        </div>
      </nav>
    </header>
  );
}
