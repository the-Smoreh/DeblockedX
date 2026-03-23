import { useEffect, useMemo, useRef, useState } from 'react';
import BlurText from './BlurText';
import CardNav from './CardNav';
import ClickSpark from './ClickSpark';
import FloatingLines from './FloatingLines';
import Masonry from './Masonry';
import RippleGrid from './RippleGrid';
import gamesData from '../games.json';

const INTRO_DURATION_MS = 3200;
const INTRO_FADE_MS = 700;
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

  useEffect(() => {
    const exitTimer = setTimeout(() => setIntroExiting(true), INTRO_DURATION_MS - INTRO_FADE_MS);
    const hideTimer = setTimeout(() => setShowIntro(false), INTRO_DURATION_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, []);

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

      {activeGame && <GameOverlay game={activeGame} onClose={() => setActiveGame(null)} />}

      {showIntro && (
        <section className={`intro-screen${introExiting ? ' intro-screen--exit' : ''}`}>
          <div className="intro-overlay" />
          <FloatingLines
            enabledWaves={['top', 'middle', 'bottom']}
            lineCount={[6, 8, 6]}
            lineDistance={[10, 14, 10]}
            bendRadius={7}
            bendStrength={-0.85}
            interactive
            parallax
            linesGradient={['#fc42ff', '#42fcff']}
          />

          <div className="intro-content">
            <BlurText text="Deblocked" delay={160} animateBy="letters" direction="top" className="hero-title" />
          </div>
        </section>
      )}
    </main>
  );
}
