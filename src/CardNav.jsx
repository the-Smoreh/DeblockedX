import { useEffect, useState } from 'react';
import './CardNav.css';

const CardNav = ({
  title = 'Deblocked',
  items,
  className = '',
  activePage = 'games',
  onNavigate,
  onOpenSettings,
  onOpenAuth,
  onOpenParties,
  user,
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
          <div
            className={`hamburger-menu ${isExpanded ? 'open' : ''}`}
            onClick={toggleMenu}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleMenu();
              }
            }}
            role="button"
            aria-label={isExpanded ? 'Close menu' : 'Open menu'}
            tabIndex={0}
            style={{ color: menuColor || '#000' }}
          >
            <div className="hamburger-line" />
            <div className="hamburger-line" />
          </div>

          <div className="logo-container">
            {!isExpanded && showCompactSearch ? (
              <label className="compact-search" aria-label="Search games">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => onSearchChange?.(event.target.value)}
                  placeholder={searchPlaceholder}
                />
                <span className="compact-search__count">{animatedSearchCount}</span>
              </label>
            ) : (
              <span className="logo-wordmark">{title}</span>
            )}
          </div>

          <div className="nav-actions">
            {user ? (
              <>
                <button
                  type="button"
                  className="header-action-button"
                  onClick={onOpenParties}
                  aria-label="Open parties"
                >
                  Parties
                </button>
                <button
                  type="button"
                  className="profile-button"
                  onClick={onOpenAuth}
                  aria-label="Open account panel"
                >
                  <img src={user.avatar} alt={`${user.username} avatar`} />
                </button>
              </>
            ) : (
              <button
                type="button"
                className="header-action-button"
                onClick={onOpenAuth}
                aria-label="Log in"
              >
                Log in
              </button>
            )}
            <button
              type="button"
              className="settings-button"
              onClick={onOpenSettings}
              aria-label="Open settings"
            >
              ⚙
            </button>
          </div>
        </div>

        <div className="card-nav-content" aria-hidden={!isExpanded}>
          {(items || []).slice(0, 3).map((item, index) => {
            const defaultPage = item.links?.[0]?.page;
            return (
              <div
                key={`${item.label}-${index}`}
                className={`nav-card ${activePage === item.label.toLowerCase() ? 'nav-card--active' : ''}`}
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
