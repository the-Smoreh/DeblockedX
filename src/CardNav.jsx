import { useState } from 'react';
import './CardNav.css';

const CardNav = ({
  title = 'Deblocked',
  items,
  className = '',
  activePage = 'games',
  onNavigate,
  baseColor = '#fff',
  menuColor,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const height = isExpanded ? 260 : 72;

  const toggleMenu = () => setIsExpanded((open) => !open);
  const handleNavigate = (page) => {
    if (page && onNavigate) {
      onNavigate(page);
    }
    setIsExpanded(false);
  };

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
            <span className="logo-wordmark">{title}</span>
          </div>

        </div>

        <div className="card-nav-content" aria-hidden={!isExpanded}>
          {(items || []).slice(0, 3).map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className={`nav-card ${activePage === item.label.toLowerCase() ? 'nav-card--active' : ''}`}
              style={{ backgroundColor: item.bgColor, color: item.textColor, transitionDelay: `${index * 80}ms` }}
            >
              <div className="nav-card-label">{item.label}</div>
              <div className="nav-card-links">
                {item.links?.map((link, linkIndex) => (
                  <button
                    key={`${link.label}-${linkIndex}`}
                    type="button"
                    className="nav-card-link"
                    aria-label={link.ariaLabel}
                    onClick={() => handleNavigate(link.page)}
                  >
                    <span className="nav-card-link-icon" aria-hidden="true">↗</span>
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default CardNav;
