import { useEffect, useState } from 'react';
import './CardNav.css';

const CardNav = ({
  title = 'Deblocked',
  items,
  tabs = [],
  className = '',
  activePage = 'games',
  onNavigate,
  onOpenSettings,
  onOpenAnnouncements,
  showCompactSearch = false,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search games...',
  searchResultCount,
  baseColor = '#fff',
  menuColor,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatedSearchCount, setAnimatedSearchCount] = useState(0);

  const height = isExpanded ? 260 : 72;

  const toggleMenu = () => setIsExpanded((open) => !open);
  const handleNavigate = (page) => {
    if (page && onNavigate) {
      onNavigate(page);
    }
    setIsExpanded(false);
  };

  useEffect(() => {
    const targetCount = Number.isFinite(Number(searchResultCount)) ? Math.max(0, Number(searchResultCount)) : 0;
    let frameId;
    let startTime;
    const animationDuration = 320;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      setAnimatedSearchCount(Math.round(targetCount * progress));
      if (progress < 1) frameId = window.requestAnimationFrame(step);
    };

    setAnimatedSearchCount(0);
    frameId = window.requestAnimationFrame(step);

    return () => window.cancelAnimationFrame(frameId);
  }, [searchResultCount]);

  return (
    <div className={`card-nav-container ${className}`}>
      <nav className={`card-nav ${isExpanded ? 'open' : ''}`} style={{ backgroundColor: baseColor, height }}>
        <div className="card-nav-top">
          <div className="nav-left">
            <button
              type="button"
              className={`hamburger-menu ${isExpanded ? 'open' : ''}`}
              onClick={toggleMenu}
              aria-label={isExpanded ? 'Close menu' : 'Open menu'}
              aria-expanded={isExpanded}
              style={{ color: menuColor || '#000' }}
            >
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>

            {tabs.length > 0 && (
              <div className="nav-tabs" role="tablist" aria-label="Pages">
                {tabs.map((tab) => (
                  <button
                    key={tab.page}
                    type="button"
                    role="tab"
                    aria-selected={activePage === tab.page}
                    className={`nav-tab${activePage === tab.page ? ' nav-tab--active' : ''}`}
                    onClick={() => handleNavigate(tab.page)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="logo-container">
            {!isExpanded && showCompactSearch ? (
              <label className="compact-search" aria-label="Search games">
                <svg className="compact-search__icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => onSearchChange?.(event.target.value)}
                  placeholder={searchPlaceholder}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="compact-search__clear"
                    onClick={() => onSearchChange?.('')}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
                <span className="compact-search__count" title="Games available">{animatedSearchCount}</span>
              </label>
            ) : (
              <span className="logo-wordmark">{title}</span>
            )}
          </div>

          <div className="nav-actions">
            <button
              type="button"
              className="header-action-button"
              onClick={onOpenAnnouncements}
              aria-label="Open announcements"
              title="Announcements"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" />
                <path d="M15 8.5a5 5 0 0 1 0 7" />
                <path d="M17.7 5a9 9 0 0 1 0 14" />
              </svg>
              <span className="header-action-button__label">News</span>
            </button>
            <button
              type="button"
              className="header-action-button header-action-button--icon"
              onClick={onOpenSettings}
              aria-label="Open settings"
              title="Settings"
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.08A1.7 1.7 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56h.08a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08A1.7 1.7 0 0 0 20.91 10H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03Z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="card-nav-content" aria-hidden={!isExpanded}>
          {(items || []).slice(0, 3).map((item, index) => {
            const defaultPage = item.links?.[0]?.page;
            const isActive = defaultPage
              ? activePage === defaultPage
              : activePage === item.label.toLowerCase();
            return (
              <div
                key={`${item.label}-${index}`}
                className={`nav-card ${isActive ? 'nav-card--active' : ''}`}
                style={{ backgroundColor: item.bgColor, color: item.textColor, transitionDelay: `${index * 80}ms` }}
                role="button"
                tabIndex={0}
                onClick={() => handleNavigate(defaultPage)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleNavigate(defaultPage);
                  }
                }}
              >
                <div className="nav-card-label">{item.label}</div>
                <div className="nav-card-links">
                  {item.links?.map((link, linkIndex) => (
                    <button
                      key={`${link.label}-${linkIndex}`}
                      type="button"
                      className="nav-card-link"
                      aria-label={link.ariaLabel}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleNavigate(link.page);
                      }}
                    >
                      <span className="nav-card-link-icon" aria-hidden="true">↗</span>
                      {link.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </nav>
    </div>
  );
};

export default CardNav;
