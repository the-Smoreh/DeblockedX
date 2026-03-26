import { useEffect, useMemo, useRef, useState } from 'react';
import BlurText from './BlurText';
import CardNav from './CardNav';
import ClickSpark from './ClickSpark';
import LineWaves from './LineWaves';
import Masonry from './Masonry';
import RippleGrid from './RippleGrid';
import gamesData from '../games.json';
import secretData from '../secret.json';

const INTRO_DURATION_MS = 3200;
const INTRO_FADE_MS = 700;
const CLOAK_PREF_KEY = 'deblockedx-cloak-on-startup';
const CLOAK_SESSION_KEY = 'deblockedx-cloak-session-done';
const SETTINGS_PREF_KEY = 'deblockedx-settings-v2';
const UNLOCKED_SECRET_KEY = 'deblockedx-secret-unlocked-v1';
const CLICK_SOUND_KEY = 'deblockedx-click-sound';
const INTRO_SOUND_KEY = 'deblockedx-intro-sound';
const FAVORITE_GAMES_KEY = 'deblockedx-favorite-games-v1';
const CUSTOM_THEME_IMAGE_KEY = 'deblockedx-custom-theme-image-v1';

const DEFAULT_SETTINGS = {
  introDurationSec: 3.2,
  enableIntro: true,
  enableAnimations: true,
  enableClickSound: false,
  enableIntroSound: false,
  performanceMode: false,
  themePreset: 'midnight',
  accentPreset: 'cyan',
  customAccent: '#58d4ff',
  smoothScroll: true,
  themeMode: 'preset',
  customSolidColor: '#101a30',
  customGradientFrom: '#0f1832',
  customGradientTo: '#070a14',
  alwaysShowGameTitles: false,
  gameIconShape: 'default',
  gameCardAspect: 'standard',
};

const THEME_PRESETS = {
  midnight: { pageFrom: '#050816', pageTo: '#03040a', card: 'rgba(6, 10, 20, 0.92)', panel: 'rgba(9, 14, 28, 0.96)' },
  nebula: { pageFrom: '#1b1035', pageTo: '#0a122d', card: 'rgba(19, 11, 43, 0.92)', panel: 'rgba(19, 15, 46, 0.96)' },
  graphite: { pageFrom: '#10151f', pageTo: '#05070d', card: 'rgba(17, 23, 35, 0.92)', panel: 'rgba(17, 22, 34, 0.96)' },
  sunset: { pageFrom: '#3f1b2f', pageTo: '#140b20', card: 'rgba(47, 21, 38, 0.92)', panel: 'rgba(44, 17, 38, 0.96)' },
  ocean: { pageFrom: '#0b2d44', pageTo: '#03131f', card: 'rgba(8, 34, 50, 0.92)', panel: 'rgba(8, 30, 45, 0.96)' },
  light: { pageFrom: '#eff5ff', pageTo: '#dee8ff', card: 'rgba(255, 255, 255, 0.9)', panel: 'rgba(247, 251, 255, 0.95)' },
};

const ACCENT_PRESETS = {
  cyan: '#58d4ff',
  violet: '#b789ff',
  lime: '#9bf44f',
  rose: '#ff7ba7',
  amber: '#ffc65c',
  mint: '#67f0cb',
};

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

const loadStorageValue = (key, fallback = '') => {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const saveStorageValue = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota/private browsing issues so app keeps running.
  }
};

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

function SettingsToggle({ checked, onChange, children, id }) {
  return (
    <label className="settings-toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} />
      <span className="settings-toggle__track" aria-hidden="true">
        <span className="settings-toggle__thumb" />
      </span>
      <span>{children}</span>
    </label>
  );
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
  const [settings, setSettings] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    const stored = loadStorageValue(SETTINGS_PREF_KEY, '');
    if (!stored) return DEFAULT_SETTINGS;

    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [clickSoundDataUrl, setClickSoundDataUrl] = useState(() => loadStorageValue(CLICK_SOUND_KEY, ''));
  const [introSoundDataUrl, setIntroSoundDataUrl] = useState(() => loadStorageValue(INTRO_SOUND_KEY, ''));
  const [customThemeImage, setCustomThemeImage] = useState(() => loadStorageValue(CUSTOM_THEME_IMAGE_KEY, ''));
  const [secretUnlocked, setSecretUnlocked] = useState(() => loadStorageValue(UNLOCKED_SECRET_KEY, '') === '1');
  const [favoriteGameIds, setFavoriteGameIds] = useState(() => {
    const stored = loadStorageValue(FAVORITE_GAMES_KEY, '[]');
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((id) => typeof id === 'string');
    } catch {
      return [];
    }
  });
  const [codeInput, setCodeInput] = useState('');
  const [codeStatus, setCodeStatus] = useState('');
  const [showIntro, setShowIntro] = useState(true);
  const [introExiting, setIntroExiting] = useState(false);
  const [activePage, setActivePage] = useState('games');
  const [activeGame, setActiveGame] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSettingsChangeAt, setLastSettingsChangeAt] = useState(Date.now());
  const [cloakOnStartup, setCloakOnStartup] = useState(() => {
    const stored = loadStorageValue(CLOAK_PREF_KEY, '');
    return stored === '' ? true : stored === 'true';
  });
  const clickAudioRef = useRef(null);
  const introAudioRef = useRef(null);

  useEffect(() => {
    if (!settings.enableIntro || settings.performanceMode) {
      setShowIntro(false);
      setIntroExiting(false);
      return undefined;
    }

    const introDurationMs = Math.max(1000, settings.introDurationSec * 1000);
    const fadeDurationMs = Math.min(INTRO_FADE_MS, introDurationMs - 100);
    const exitTimer = setTimeout(() => setIntroExiting(true), introDurationMs - fadeDurationMs);
    const hideTimer = setTimeout(() => {
      setShowIntro(false);
      setIntroExiting(false);
    }, introDurationMs);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, [settings.enableIntro, settings.introDurationSec, settings.performanceMode]);

  useEffect(() => {
    saveStorageValue(SETTINGS_PREF_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    saveStorageValue(CLICK_SOUND_KEY, clickSoundDataUrl);
  }, [clickSoundDataUrl]);

  useEffect(() => {
    saveStorageValue(INTRO_SOUND_KEY, introSoundDataUrl);
  }, [introSoundDataUrl]);

  useEffect(() => {
    saveStorageValue(CUSTOM_THEME_IMAGE_KEY, customThemeImage);
  }, [customThemeImage]);

  useEffect(() => {
    if (!secretUnlocked) return;
    saveStorageValue(UNLOCKED_SECRET_KEY, '1');
  }, [secretUnlocked]);

  useEffect(() => {
    saveStorageValue(FAVORITE_GAMES_KEY, JSON.stringify(favoriteGameIds));
  }, [favoriteGameIds]);

  useEffect(() => {
    saveStorageValue(CLOAK_PREF_KEY, String(cloakOnStartup));
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

  useEffect(() => {
    document.documentElement.style.scrollBehavior = settings.smoothScroll ? 'smooth' : 'auto';
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, [settings.smoothScroll]);

  useEffect(() => {
    const handlePointerDown = () => {
      if (!settings.enableClickSound || !clickAudioRef.current) return;
      clickAudioRef.current.currentTime = 0;
      clickAudioRef.current.play().catch(() => {});
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [settings.enableClickSound, clickSoundDataUrl]);

  useEffect(() => {
    if (!showIntro || !settings.enableIntroSound || !introAudioRef.current) return;
    introAudioRef.current.currentTime = 0;
    introAudioRef.current.play().catch(() => {});
  }, [settings.enableIntroSound, showIntro, introSoundDataUrl]);

  const masonryItems = useMemo(
    () => {
      const completeGames = secretUnlocked ? [...secretData.games, ...gamesData] : gamesData;
      const favoriteRank = new Map(favoriteGameIds.map((id, index) => [id, index]));
      const idCounts = new Map();
      const aspectMultiplier = settings.gameCardAspect === 'wide' ? 0.72 : settings.gameCardAspect === 'tall' ? 1.24 : 1;

      return completeGames
        .map((game, index) => {
          const baseId = game.url || game.title || game.id || `game-${index}`;
          const occurrence = idCounts.get(baseId) ?? 0;
          idCounts.set(baseId, occurrence + 1);
          const id = `${baseId}::${occurrence}`;
          return {
            id,
            originalIndex: index,
            isFavorite: favoriteRank.has(id),
            title: game.title,
            description: game.description,
            img: game.game_image_icon,
            url: game.url,
            height: (game.featured ? 520 : 420 + ((index % 4) * 40)) * aspectMultiplier,
          };
        })
        .sort((a, b) => {
          const aFavoriteIndex = favoriteRank.get(a.id);
          const bFavoriteIndex = favoriteRank.get(b.id);
          const aIsFavorite = aFavoriteIndex !== undefined;
          const bIsFavorite = bFavoriteIndex !== undefined;

          if (aIsFavorite && bIsFavorite) return aFavoriteIndex - bFavoriteIndex;
          if (aIsFavorite) return -1;
          if (bIsFavorite) return 1;
          return a.originalIndex - b.originalIndex;
        });
   }, [secretUnlocked, favoriteGameIds, gamesData, secretData, settings.gameCardAspect]);


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

  const isAnimationEnabled = settings.enableAnimations && !settings.performanceMode;
  const presetTheme = THEME_PRESETS[settings.themePreset] ?? THEME_PRESETS.midnight;
  const activeTheme = {
    pageFrom: settings.themeMode === 'solid' ? settings.customSolidColor : settings.themeMode === 'gradient' ? settings.customGradientFrom : presetTheme.pageFrom,
    pageTo: settings.themeMode === 'solid' ? settings.customSolidColor : settings.themeMode === 'gradient' ? settings.customGradientTo : presetTheme.pageTo,
    card: presetTheme.card,
    panel: presetTheme.panel,
  };
  const activeAccent = settings.accentPreset === 'custom'
    ? settings.customAccent
    : (ACCENT_PRESETS[settings.accentPreset] ?? ACCENT_PRESETS.cyan);

  const filteredMasonryItems = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) return masonryItems;
    return masonryItems.filter((item) => item.title?.toLowerCase().includes(normalizedSearch));
  }, [masonryItems, searchQuery]);

  const updateSetting = (key, value) => {
    setLastSettingsChangeAt(Date.now());
    setSettings((current) => {
      if (key === 'performanceMode') {
        return {
          ...current,
          performanceMode: value,
          enableAnimations: value ? false : current.enableAnimations,
        };
      }

      if (key === 'enableAnimations') {
        return {
          ...current,
          enableAnimations: value,
          performanceMode: value ? false : current.performanceMode,
        };
      }

      return { ...current, [key]: value };
    });
  };

  const handleAudioFileUpload = async (event, target) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    if (typeof dataUrl !== 'string') return;
    if (target === 'click') setClickSoundDataUrl(dataUrl);
    if (target === 'intro') setIntroSoundDataUrl(dataUrl);
    setLastSettingsChangeAt(Date.now());
    event.target.value = '';
  };

  const handleThemeImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    if (typeof dataUrl !== 'string') return;
    setCustomThemeImage(dataUrl);
    updateSetting('themeMode', 'image');
    event.target.value = '';
  };

  const handleToggleFavoriteGame = (gameId) => {
    setFavoriteGameIds((current) => {
      if (current.includes(gameId)) {
        return current.filter((id) => id !== gameId);
      }
      return [...current, gameId];
    });
  };

  const handleUnlockCode = () => {
    if (!secretData?.code) {
      setCodeStatus('❌ Secret data unavailable.');
      return;
    }

    if (secretUnlocked) {
      setCodeStatus('✅ Secret games are already unlocked.');
      return;
    }

    const submittedCode = codeInput.trim().toUpperCase();
    if (!submittedCode) {
      setCodeStatus('❌ Enter a code first.');
      return;
    }

    const expectedCode = secretData.code.trim().toUpperCase();
    if (submittedCode === expectedCode) {
      setSecretUnlocked(true);
      setCodeStatus('✅ Code accepted. Secret games unlocked at the top.');
      setCodeInput('');
      return;
    }

    setCodeStatus('❌ Invalid code.');
  };


  return (
    <main
      className={`app-shell app-shell--${activePage}${settings.performanceMode ? ' app-shell--performance' : ''}${settings.themePreset === 'light' ? ' app-shell--light' : ''}`}
      style={{
        '--page-gradient-from': activeTheme.pageFrom,
        '--page-gradient-to': activeTheme.pageTo,
        '--page-image': settings.themeMode === 'image' && customThemeImage ? `url(${customThemeImage})` : 'none',
        '--nav-surface': activeTheme.card,
        '--panel-surface': activeTheme.panel,
        '--accent-color': activeAccent,
      }}
    >
      {clickSoundDataUrl && <audio ref={clickAudioRef} src={clickSoundDataUrl} preload="auto" />}
      {introSoundDataUrl && <audio ref={introAudioRef} src={introSoundDataUrl} preload="auto" />}
      {!activeGame && (
        <section className={`main-content${showIntro ? ' main-content--intro-active' : ' main-content--intro-ready'}`}>
          <div className={`main-background${activePage === 'games' ? ' main-background--games' : ''}`}>
            {activePage === 'games' || !isAnimationEnabled ? <div className="games-backdrop" aria-hidden="true" /> : (
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

          {isAnimationEnabled ? (
            <ClickSpark sparkColor="#fff" sparkSize={7} sparkRadius={30} sparkCount={8} duration={400}>
              <section className="page-shell">
                <CardNav
                  title="deblocked"
                  items={navItems}
                  activePage={activePage}
                  onNavigate={setActivePage}
                  showCompactSearch={activePage === 'games'}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  searchResultCount={filteredMasonryItems.length}
                  onOpenSettings={() => setSettingsOpen(true)}
                  baseColor="var(--nav-surface)"
                  menuColor="#ffffff"
                  ease="power3.out"
                />

                {activePage === 'games' ? (
                  <section className="games-page games-page--compact">
                    <Masonry
                      items={filteredMasonryItems}
                      onItemClick={setActiveGame}
                      onToggleFavorite={handleToggleFavoriteGame}
                      stagger={0.05}
                      hoverScale={0.97}
                      alwaysShowTitles={settings.alwaysShowGameTitles}
                      iconShape={settings.gameIconShape}
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
          ) : (
            <section className="page-shell">
              <CardNav
                title="deblocked"
                items={navItems}
                activePage={activePage}
                onNavigate={setActivePage}
                showCompactSearch={activePage === 'games'}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchResultCount={filteredMasonryItems.length}
                onOpenSettings={() => setSettingsOpen(true)}
                baseColor="var(--nav-surface)"
                menuColor="#ffffff"
                ease="power3.out"
              />

              {activePage === 'games' ? (
                <section className="games-page games-page--compact">
                  <Masonry
                    items={filteredMasonryItems}
                    onItemClick={setActiveGame}
                    onToggleFavorite={handleToggleFavoriteGame}
                    stagger={0.05}
                    hoverScale={0.97}
                    alwaysShowTitles={settings.alwaysShowGameTitles}
                    iconShape={settings.gameIconShape}
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
          )}
        </section>
      )}

      {activeGame && <GameOverlay game={activeGame} onClose={() => setActiveGame(null)} />}

      {showIntro && (
        <section className={`intro-screen${introExiting ? ' intro-screen--exit' : ''}`}>
          {isAnimationEnabled ? (
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
          ) : (
            <div className="intro-static" />
          )}
          <div className="intro-overlay" />

          <div className="intro-content">
            <BlurText text="Deblocked" delay={160} animateBy="letters" direction="top" className="hero-title" />
          </div>
        </section>
      )}

      {settingsOpen && (
        <div className="settings-modal" role="dialog" aria-modal="true" aria-label="Settings">
          <div className={`settings-modal__panel${isAnimationEnabled ? ' settings-modal__panel--animated' : ''}`}>
            <header className="settings-modal__header">
              <div>
                <h2>Settings UI</h2>
                <p className="settings-status">Saved automatically · Last change {new Date(lastSettingsChangeAt).toLocaleTimeString()}</p>
              </div>
              <button type="button" className="settings-modal__close" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                ×
              </button>
            </header>

            <div className="settings-content settings-content--single">
              <section className="settings-block">
                <h3>Appearance</h3>
                <p className="settings-copy">Pick a theme style, upload your own background, or create custom colors.</p>
                <div className="settings-subsection">
                  <h4>Theme presets</h4>
                  <div className="settings-chip-row">
                    {Object.keys(THEME_PRESETS).map((themeKey) => (
                      <button key={themeKey} type="button" className={`settings-chip${settings.themePreset === themeKey ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('themePreset', themeKey)}>
                        {themeKey}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="settings-subsection">
                  <h4>Theme source</h4>
                  <div className="settings-chip-row">
                    <button type="button" className={`settings-chip${settings.themeMode === 'preset' ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('themeMode', 'preset')}>Preset</button>
                    <button type="button" className={`settings-chip${settings.themeMode === 'solid' ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('themeMode', 'solid')}>Solid color</button>
                    <button type="button" className={`settings-chip${settings.themeMode === 'gradient' ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('themeMode', 'gradient')}>2-color gradient</button>
                    <button type="button" className={`settings-chip${settings.themeMode === 'image' ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('themeMode', 'image')}>Image</button>
                  </div>
                  {settings.themeMode === 'solid' && (
                    <label className="settings-color-field">
                      <span>Solid color</span>
                      <input type="color" value={settings.customSolidColor} onChange={(event) => updateSetting('customSolidColor', event.target.value)} />
                    </label>
                  )}
                  {settings.themeMode === 'gradient' && (
                    <div className="settings-gradient-grid">
                      <label className="settings-color-field">
                        <span>Gradient color 1</span>
                        <input type="color" value={settings.customGradientFrom} onChange={(event) => updateSetting('customGradientFrom', event.target.value)} />
                      </label>
                      <label className="settings-color-field">
                        <span>Gradient color 2</span>
                        <input type="color" value={settings.customGradientTo} onChange={(event) => updateSetting('customGradientTo', event.target.value)} />
                      </label>
                    </div>
                  )}
                  <label className="settings-upload">
                    <span>Upload custom theme image</span>
                    <input type="file" accept="image/*" onChange={handleThemeImageUpload} />
                  </label>
                </div>
                <div className="settings-subsection">
                  <h4>Accent color</h4>
                  <div className="settings-chip-row">
                    {Object.keys(ACCENT_PRESETS).map((accentKey) => (
                      <button key={accentKey} type="button" className={`settings-chip${settings.accentPreset === accentKey ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('accentPreset', accentKey)}>
                        {accentKey}
                      </button>
                    ))}
                    <button type="button" className={`settings-chip${settings.accentPreset === 'custom' ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('accentPreset', 'custom')}>
                      custom
                    </button>
                  </div>
                  {settings.accentPreset === 'custom' && (
                    <label className="settings-color-field">
                      <span>Custom accent</span>
                      <input type="color" value={settings.customAccent} onChange={(event) => updateSetting('customAccent', event.target.value)} />
                    </label>
                  )}
                </div>
              </section>

              <section className="settings-block">
                <h3>Games page behavior</h3>
                <div className="settings-subsection">
                  <h4>Title visibility</h4>
                  <SettingsToggle
                    id="always-show-titles-toggle"
                    checked={settings.alwaysShowGameTitles}
                    onChange={(event) => updateSetting('alwaysShowGameTitles', event.target.checked)}
                  >
                    Always show game titles without hovering
                  </SettingsToggle>
                </div>
                <div className="settings-subsection">
                  <h4>Game tile shape (not border roundness)</h4>
                  <div className="settings-chip-row">
                    <button type="button" className={`settings-chip${settings.gameCardAspect === 'standard' ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('gameCardAspect', 'standard')}>Standard</button>
                    <button type="button" className={`settings-chip${settings.gameCardAspect === 'wide' ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('gameCardAspect', 'wide')}>Rectangle (wide)</button>
                    <button type="button" className={`settings-chip${settings.gameCardAspect === 'tall' ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('gameCardAspect', 'tall')}>Tall</button>
                  </div>
                </div>
              </section>

              <section className="settings-block">
                <h3>Flow + Performance</h3>
                <div className="settings-mode-grid">
                  <button
                    type="button"
                    className={`settings-mode-card${isAnimationEnabled ? ' settings-mode-card--active' : ''}`}
                    onClick={() => {
                      updateSetting('enableAnimations', true);
                      updateSetting('performanceMode', false);
                    }}
                  >
                    <strong>Flow Mode</strong>
                    <span>Smooth transitions, hover effects, and animated intro.</span>
                  </button>
                  <button
                    type="button"
                    className={`settings-mode-card${settings.performanceMode ? ' settings-mode-card--active' : ''}`}
                    onClick={() => {
                      updateSetting('performanceMode', true);
                      updateSetting('enableAnimations', false);
                    }}
                  >
                    <strong>Performance Mode</strong>
                    <span>Disables motion for faster rendering and lower battery usage.</span>
                  </button>
                </div>
                <SettingsToggle
                  id="enable-animations-toggle"
                  checked={settings.enableAnimations}
                  onChange={(event) => updateSetting('enableAnimations', event.target.checked)}
                >
                  Enable animations (default on)
                </SettingsToggle>
                <SettingsToggle
                  id="performance-mode-toggle"
                  checked={settings.performanceMode}
                  onChange={(event) => updateSetting('performanceMode', event.target.checked)}
                >
                  Performance mode (turns off all animations)
                </SettingsToggle>
                <SettingsToggle
                  id="smooth-scroll-toggle"
                  checked={settings.smoothScroll}
                  onChange={(event) => updateSetting('smoothScroll', event.target.checked)}
                >
                  Smooth scrolling
                </SettingsToggle>
                <p className="settings-copy">You can always switch between animated mode and performance mode.</p>
              </section>

              <section className="settings-block">
                <h3>Intro controls</h3>
                <SettingsToggle
                  id="show-intro-toggle"
                  checked={settings.enableIntro}
                  onChange={(event) => updateSetting('enableIntro', event.target.checked)}
                >
                  Show intro screen on launch
                </SettingsToggle>
                <label className="settings-range" htmlFor="intro-duration">
                  <span>Intro duration (seconds): {settings.introDurationSec.toFixed(1)}s</span>
                  <input
                    id="intro-duration"
                    type="range"
                    min="1"
                    max="12"
                    step="0.5"
                    value={settings.introDurationSec}
                    onChange={(event) => updateSetting('introDurationSec', Number(event.target.value))}
                  />
                </label>
                <SettingsToggle
                  id="enable-intro-sound-toggle"
                  checked={settings.enableIntroSound}
                  onChange={(event) => updateSetting('enableIntroSound', event.target.checked)}
                >
                  Enable intro sound
                </SettingsToggle>
                <label className="settings-upload">
                  <span>Upload custom intro sound (mp3)</span>
                  <input type="file" accept="audio/mpeg,audio/mp3,audio/*" onChange={(event) => handleAudioFileUpload(event, 'intro')} />
                </label>
              </section>

              <section className="settings-block">
                <h3>Click sound controls</h3>
                <SettingsToggle
                  id="enable-click-sound-toggle"
                  checked={settings.enableClickSound}
                  onChange={(event) => updateSetting('enableClickSound', event.target.checked)}
                >
                  Allow click sound across the website
                </SettingsToggle>
                <label className="settings-upload">
                  <span>Upload custom click sound (mp3)</span>
                  <input type="file" accept="audio/mpeg,audio/mp3,audio/*" onChange={(event) => handleAudioFileUpload(event, 'click')} />
                </label>
              </section>

              <section className="settings-block">
                <h3>Stealth tools + toggles</h3>
                <SettingsToggle
                  id="cloak-startup-toggle"
                  checked={cloakOnStartup}
                  onChange={(event) => {
                    setLastSettingsChangeAt(Date.now());
                    setCloakOnStartup(event.target.checked);
                  }}
                >
                  Enable About:Blank cloaking on startup
                </SettingsToggle>
                <button type="button" className="settings-chip settings-chip--cta" onClick={() => launchAboutBlankCloak()}>
                  Launch About:Blank now
                </button>
              </section>

              <section className="settings-block">
                <h3>Secret game code</h3>
                <p className="settings-copy">Enter a code to unlock extra games that get pinned to the top of the games page.</p>
                <div className="settings-code-row">
                  <input
                    className="settings-code-input"
                    type="text"
                    placeholder="Enter game code"
                    value={codeInput}
                    onChange={(event) => setCodeInput(event.target.value)}
                  />
                  <button type="button" className="settings-chip settings-chip--active" onClick={handleUnlockCode}>Unlock</button>
                </div>
                {codeStatus && <p className="settings-copy">{codeStatus}</p>}
              </section>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
