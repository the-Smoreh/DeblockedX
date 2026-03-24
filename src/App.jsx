import { useEffect, useMemo, useRef, useState } from 'react';
import BlurText from './BlurText';
import CardNav from './CardNav';
import ClickSpark from './ClickSpark';
import LineWaves from './LineWaves';
import Masonry from './Masonry';
import RippleGrid from './RippleGrid';
import gamesData from '../games.json';

const INTRO_DURATION_MS = 3200;
const INTRO_FADE_MS = 700;
const CLOAK_PREF_KEY = 'deblockedx-cloak-on-startup';
const CLOAK_SESSION_KEY = 'deblockedx-cloak-session-done';

const hacksItems = [
  {
    title: 'Bookmarklets',
    description: 'Quick-launch tools for bypass helpers, tab cloaking, and classroom-safe shortcuts.',
  },
  {
    title: 'Console Hacks',
    description: 'Devtools snippets and browser-console tweaks collected into a dedicated hacks hub.',
  },
  {
    title: 'Stealth Tools',
    description: 'A separate staging area for privacy-focused utilities and future experiments.',
  },
];

const formatBatteryLevel = (level) => `${Math.round(level * 100)}%`;

function launchAboutBlankCloak() {
  if (typeof window === 'undefined') return false;
  if (window.self !== window.top) return false;

  const popup = window.open('about:blank', '_blank');
  if (!popup) return false;

  popup.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Classes</title>
        <style>
          html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #111; }
          iframe { border: 0; width: 100vw; height: 100vh; display: block; }
        </style>
      </head>
      <body>
        <iframe src="${window.location.href}" allow="fullscreen *"></iframe>
      </body>
    </html>
  `);
  popup.document.close();

  window.location.replace('https://www.google.com');
  return true;
}

function GameOverlay({ game, onClose }) {
  const [fps, setFps] = useState(0);
  const [battery, setBattery] = useState('Unavailable');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameShellRef = useRef(null);

  useEffect(() => {
    let frameCount = 0;
    let previousTimestamp = performance.now();
    let animationFrameId;

    const updateFps = (timestamp) => {
      frameCount += 1;
      const elapsed = timestamp - previousTimestamp;
      if (elapsed >= 1000) {
        setFps(Math.round((frameCount * 1000) / elapsed));
        frameCount = 0;
        previousTimestamp = timestamp;
      }
      animationFrameId = window.requestAnimationFrame(updateFps);
    };

    animationFrameId = window.requestAnimationFrame(updateFps);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    let batteryManager;
    let mounted = true;

    const syncBattery = () => {
      if (!mounted || !batteryManager) return;
      setBattery(formatBatteryLevel(batteryManager.level));
    };

    if ('getBattery' in navigator) {
      navigator.getBattery().then((manager) => {
        if (!mounted) return;
        batteryManager = manager;
        syncBattery();
        manager.addEventListener('levelchange', syncBattery);
      }).catch(() => setBattery('Unavailable'));
    }

    return () => {
      mounted = false;
      batteryManager?.removeEventListener('levelchange', syncBattery);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === gameShellRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !document.fullscreenElement) {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleToggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === gameShellRef.current) {
        await document.exitFullscreen();
      } else {
        await gameShellRef.current?.requestFullscreen();
      }
    } catch {
      // Fullscreen can fail on some embeds or browsers.
    }
  };

  const handleClose = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore fullscreen exit issues and still close the overlay.
      }
    }
    onClose();
  };

  return (
    <div className="game-overlay" role="dialog" aria-modal="true" aria-label={`${game.title} player`}>
      <div ref={gameShellRef} className={`game-overlay__shell${isFullscreen ? ' game-overlay__shell--fullscreen' : ''}`}>
        <iframe
          className="game-overlay__frame"
          src={game.url}
          title={game.title}
          loading="eager"
          allow="autoplay; fullscreen; gamepad; xr-spatial-tracking"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />

        <div className="game-overlay__hud game-overlay__hud--top-left">
          <span className="game-overlay__label">Game</span>
          <strong>{game.title}</strong>
        </div>

        <div className="game-overlay__hud game-overlay__hud--top-right game-overlay__hud--actions">
          <button type="button" className="game-overlay__button" onClick={handleToggleFullscreen}>
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button type="button" className="game-overlay__button game-overlay__button--danger" onClick={handleClose}>
            Close
          </button>
        </div>

        <div className="game-overlay__hud game-overlay__hud--bottom-left">
          <span className="game-overlay__label">FPS</span>
          <strong>{fps || '...'}</strong>
        </div>

        <div className="game-overlay__hud game-overlay__hud--bottom-right">
          <span className="game-overlay__label">Battery</span>
          <strong>{battery}</strong>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [introExiting, setIntroExiting] = useState(false);
  const [activePage, setActivePage] = useState('games');
  const [activeGame, setActiveGame] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cloakOnStartup, setCloakOnStartup] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem(CLOAK_PREF_KEY);
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    const exitTimer = setTimeout(() => setIntroExiting(true), INTRO_DURATION_MS - INTRO_FADE_MS);
    const hideTimer = setTimeout(() => {
      setShowIntro(false);
      setIntroExiting(false);
    }, INTRO_DURATION_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CLOAK_PREF_KEY, String(cloakOnStartup));
  }, [cloakOnStartup]);

  useEffect(() => {
    if (!cloakOnStartup) return;
    if (window.sessionStorage.getItem(CLOAK_SESSION_KEY)) return;

    const timer = window.setTimeout(() => {
      const launched = launchAboutBlankCloak();
      if (launched) {
        window.sessionStorage.setItem(CLOAK_SESSION_KEY, '1');
      }
    }, 50);

    return () => window.clearTimeout(timer);
  }, [cloakOnStartup]);

  const masonryItems = useMemo(
    () => gamesData.map((game, index) => ({
      id: `${game.title}-${index}`,
      title: game.title,
      description: game.description,
      img: game.game_image_icon,
      url: game.url,
      height: game.featured ? 520 : 420 + ((index % 4) * 40),
    })),
    [],
  );

  const navItems = useMemo(
    () => [
      {
        label: 'Games',
        bgColor: activePage === 'games' ? '#1a2235' : '#111827',
        textColor: '#fff',
        links: [{ label: 'Open game page', ariaLabel: 'Open game page', page: 'games' }],
      },
      {
        label: 'Hacks',
        bgColor: activePage === 'hacks' ? '#362046' : '#1a1029',
        textColor: '#fff',
        links: [
          { label: 'Bookmarklets', ariaLabel: 'Open hacks page', page: 'hacks' },
          { label: 'Console hacks', ariaLabel: 'Open hacks page', page: 'hacks' },
        ],
      },
      {
        label: 'Proxies',
        bgColor: '#202838',
        textColor: '#fff',
        links: [{ label: 'See everything', ariaLabel: 'See every proxy', page: 'games' }],
      },
    ],
    [activePage],
  );

  return (
    <main className={`app-shell app-shell--${activePage}`}>
      {!activeGame && (
        <section className="main-content">
          <div className={`main-background${activePage === 'games' ? ' main-background--games' : ''}`}>
            {activePage === 'games' ? <div className="games-backdrop" aria-hidden="true" /> : (
              <RippleGrid
                enableRainbow={false}
                gridColor="#ffffff"
                rippleIntensity={0.05}
                gridSize={10}
                gridThickness={15}
                mouseInteraction
                mouseInteractionRadius={1.2}
                opacity={0.8}
              />
            )}
          </div>

          <ClickSpark sparkColor="#fff" sparkSize={7} sparkRadius={30} sparkCount={8} duration={400}>
            <section className="page-shell">
              <CardNav
                title="deblocked"
                items={navItems}
                activePage={activePage}
                onNavigate={setActivePage}
                onOpenSettings={() => setSettingsOpen(true)}
                baseColor="rgba(6, 10, 20, 0.92)"
                menuColor="#ffffff"
                ease="power3.out"
              />

              {activePage === 'games' ? (
                <section className="games-page games-page--compact">
                  <Masonry
                    items={masonryItems}
                    onItemClick={setActiveGame}
                    stagger={0.05}
                    hoverScale={0.97}
                  />
                </section>
              ) : (
                <section className="hacks-page">
                  <div className="hacks-page__content">
                    <div className="games-page__intro hacks-page__intro">
                      <p className="eyebrow">Hacks Page</p>
                      <h1>Separate hacks staging area.</h1>
                      <p className="page-copy">Bookmarklets, console hacks, and stealth tools now have their own dedicated page instead of sharing the games screen.</p>
                    </div>
                    <div className="hacks-grid">
                      {hacksItems.map((item) => (
                        <article key={item.title} className="hacks-card">
                          <p className="eyebrow">Toolset</p>
                          <h2>{item.title}</h2>
                          <p>{item.description}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </section>
          </ClickSpark>
        </section>
      )}

      {activeGame && <GameOverlay game={activeGame} onClose={() => setActiveGame(null)} />}

      {showIntro && (
        <section className={`intro-screen${introExiting ? ' intro-screen--exit' : ''}`}>
          <LineWaves
            speed={0.3}
            innerLineCount={32}
            outerLineCount={36}
            warpIntensity={1}
            rotation={-45}
            edgeFadeWidth={0}
            colorCycleSpeed={1}
            brightness={0.2}
            color1="#ffffff"
            color2="#ffffff"
            color3="#ffffff"
            enableMouseInteraction
            mouseInfluence={2}
          />
          <div className="intro-overlay" />

          <div className="intro-content">
            <BlurText text="Deblocked" delay={160} animateBy="letters" direction="top" className="hero-title" />
          </div>
        </section>
      )}

      {settingsOpen && (
        <div className="settings-modal" role="dialog" aria-modal="true" aria-label="Settings">
          <div className="settings-modal__panel">
            <header className="settings-modal__header">
              <h2>Settings</h2>
              <button type="button" className="settings-modal__close" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                ×
              </button>
            </header>

            <div className="settings-modal__layout">
              <aside className="settings-sidebar">
                <p className="eyebrow">Categories</p>
                <button type="button" className="settings-sidebar__item settings-sidebar__item--active">Appearance</button>
                <button type="button" className="settings-sidebar__item">Layout & Cards</button>
                <button type="button" className="settings-sidebar__item">Privacy & Launch</button>
              </aside>

              <div className="settings-content">
                <section className="settings-block">
                  <h3>Display</h3>
                  <p className="settings-copy">Placeholder layout for future visual customization settings.</p>
                  <div className="settings-chip-row">
                    <button type="button" className="settings-chip settings-chip--active">Dark</button>
                    <button type="button" className="settings-chip">Experimental Light</button>
                  </div>
                </section>

                <section className="settings-block">
                  <h3>Background</h3>
                  <p className="settings-copy">Mock controls to show how the settings panel can expand over time.</p>
                  <div className="settings-chip-row">
                    <button type="button" className="settings-chip settings-chip--active">Stars</button>
                    <button type="button" className="settings-chip">Gradient</button>
                    <button type="button" className="settings-chip">Image</button>
                  </div>
                </section>

                <section className="settings-block">
                  <h3>Stealth Tools</h3>
                  <label className="settings-toggle" htmlFor="cloak-startup-toggle">
                    <input
                      id="cloak-startup-toggle"
                      type="checkbox"
                      checked={cloakOnStartup}
                      onChange={(event) => setCloakOnStartup(event.target.checked)}
                    />
                    <span>Enable About:Blank cloaking on startup</span>
                  </label>
                  <div className="settings-chip-row">
                    <button type="button" className="settings-chip settings-chip--cta" onClick={() => launchAboutBlankCloak()}>
                      Launch About:Blank now
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
