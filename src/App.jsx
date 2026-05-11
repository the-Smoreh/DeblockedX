import { useEffect, useMemo, useRef, useState } from 'react';
import CardNav from './CardNav';
import ClickSpark from './ClickSpark';
import Masonry from './Masonry';
import gamesData from '../games.json';
import secretData from '../secret.json';
import announcementsData from '../announcements.json';

const CLOAK_PREF_KEY = 'deblockedx-cloak-on-startup';
const CLOAK_SESSION_KEY = 'deblockedx-cloak-session-done';
const SETTINGS_PREF_KEY = 'deblockedx-settings-v2';
const UNLOCKED_SECRET_KEY = 'deblockedx-secret-unlocked-v1';
const CLICK_SOUND_KEY = 'deblockedx-click-sound';
const FAVORITE_GAMES_KEY = 'deblockedx-favorite-games-v1';
const CUSTOM_THEME_IMAGE_KEY = 'deblockedx-custom-theme-image-v1';
const BACKGROUND_AUDIO_KEY = 'deblockedx-background-audio-v1';
const ANNOUNCEMENT_SEEN_KEY = 'deblockedx-announcement-seen-v1';
const ANNOUNCEMENT_DELAY_MS = 60 * 60 * 1000;

const DEFAULT_SETTINGS = {
  enableAnimations: true,
  enableClickSound: false,
  performanceMode: true,
  themePreset: 'midnight',
  accentPreset: 'cyan',
  customAccent: '#58d4ff',
  smoothScroll: true,
  themeMode: 'preset',
  customSolidColor: '#101a30',
  customGradientFrom: '#0f1832',
  customGradientTo: '#070a14',
  gradientDirection: 'vertical',
  alwaysShowGameTitles: false,
  gameIconShape: 'default',
  gameIconDensity: 'default',
  gameCardAspect: 'standard',
  dynamicStarsEnabled: true,
  dynamicStarsDirection: 'down',
  dynamicStarsOrigin: 'top',
  dynamicStarsSize: 'medium',
  dynamicStarsConnectMode: false,
  enableBackgroundAudio: false,
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

const MINECRAFT_SERVER = {
  java: { address: '135.148.252.219', port: '25961', combined: '135.148.252.219:25961' },
  bedrock: { address: '135.148.252.219', port: '25961' },
};

const GAMES_LIBRARY_PREF_KEY = 'deblockedx-games-library-v1';

const formatBatteryLevel = (level) => `${Math.round(level * 100)}%`;

const normalizeSecretConfig = (rawSecretData) => {
  if (Array.isArray(rawSecretData)) {
    return rawSecretData[0] ?? {};
  }
  if (rawSecretData && typeof rawSecretData === 'object') {
    return rawSecretData;
  }
  return {};
};

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

const readJsonStorage = (key, fallback) => {
  const raw = loadStorageValue(key, '');
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

function SecondLibraryGames() {
  const containerRef = useRef(null);
  const [embedError, setEmbedError] = useState('');

  useEffect(() => {
    let isActive = true;

    const getLuminClient = () => window.Lumin || window.Lumen || null;

    const ensureLuminLoaded = () => new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window is unavailable.'));
        return;
      }

      const activeClient = getLuminClient();
      if (activeClient) {
        resolve(activeClient);
        return;
      }

      const resolveWhenReady = () => {
        const luminClient = getLuminClient();
        if (luminClient) {
          resolve(luminClient);
          return;
        }
        reject(new Error('Lumin client was not found on window after script load.'));
      };

      const existingScript = document.querySelector('script[data-lumin-sdk="true"]');
      if (existingScript) {
        if (existingScript.dataset.loaded === 'true') {
          resolveWhenReady();
          return;
        }

        existingScript.addEventListener('load', resolveWhenReady, { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Could not load Lumin SDK script.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/gh/luminsdk/script@latest/lumin.min.js';
      script.async = true;
      script.dataset.luminSdk = 'true';
      script.onload = () => {
        script.dataset.loaded = 'true';
        resolveWhenReady();
      };
      script.onerror = () => reject(new Error('Could not load Lumin SDK script.'));
      document.body.appendChild(script);
    });

    const initLibrary = async () => {
      try {
        const lumin = await ensureLuminLoaded();
        if (!isActive || !containerRef.current) return;

        if (!containerRef.current.id) {
          containerRef.current.id = 'second-library-games-root';
        }

        containerRef.current.innerHTML = '';
        lumin.init({
          container: `#${containerRef.current.id}`,
          theme: 'dark',
          gamesPerPage: 1000,
        });
      } catch {
        if (!isActive) return;
        setEmbedError('Could not load the second game library right now.');
      }
    };

    initLibrary();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="second-library" aria-label="Main games library">
      <div ref={containerRef} className="second-library__embed" />
      {embedError && <p className="second-library__error">{embedError}</p>}
    </section>
  );
}

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

function DynamicStars({
  enabled,
  direction = 'down',
  origin = 'top',
  size = 'medium',
  connectMode = false,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    const stars = [];
    const sizeMultiplier = size === 'small' ? 0.65 : size === 'large' ? 1.5 : 1;
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const starCount = Math.max(80, Math.floor((canvas.width * canvas.height) / 22000));
      stars.length = 0;

      for (let index = 0; index < starCount; index += 1) {
        const radius = (Math.random() * 1.8 + 0.7) * sizeMultiplier;
        const speed = (Math.random() * 0.8 + 0.3) * sizeMultiplier;
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        if (origin === 'top') y = -Math.random() * canvas.height;
        if (origin === 'bottom') y = canvas.height + Math.random() * canvas.height;
        if (origin === 'left') x = -Math.random() * canvas.width;
        if (origin === 'right') x = canvas.width + Math.random() * canvas.width;
        stars.push({ x, y, radius, speed });
      }
    };

    const resetStar = (star) => {
      if (direction === 'down') {
        star.y = -20;
        star.x = Math.random() * canvas.width;
      } else if (direction === 'up') {
        star.y = canvas.height + 20;
        star.x = Math.random() * canvas.width;
      } else if (direction === 'left') {
        star.x = canvas.width + 20;
        star.y = Math.random() * canvas.height;
      } else {
        star.x = -20;
        star.y = Math.random() * canvas.height;
      }
    };

    const render = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        if (direction === 'down') star.y += star.speed;
        if (direction === 'up') star.y -= star.speed;
        if (direction === 'left') star.x -= star.speed;
        if (direction === 'right') star.x += star.speed;

        if (star.x < -30 || star.x > canvas.width + 30 || star.y < -30 || star.y > canvas.height + 30) {
          resetStar(star);
        }

        context.beginPath();
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fillStyle = 'rgba(255, 255, 255, 0.85)';
        context.fill();
      });

      if (connectMode) {
        const maxDistance = 120;
        context.strokeStyle = 'rgba(185, 225, 255, 0.2)';
        context.lineWidth = 0.75;
        for (let i = 0; i < stars.length; i += 1) {
          for (let j = i + 1; j < stars.length; j += 1) {
            const distance = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y);
            if (distance < maxDistance) {
              context.globalAlpha = 1 - (distance / maxDistance);
              context.beginPath();
              context.moveTo(stars[i].x, stars[i].y);
              context.lineTo(stars[j].x, stars[j].y);
              context.stroke();
            }
          }
        }
        context.globalAlpha = 1;
      }

      animationFrameId = window.requestAnimationFrame(render);
    };

    resize();
    window.addEventListener('resize', resize);
    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [connectMode, direction, enabled, origin, size]);

  return <canvas ref={canvasRef} className="dynamic-stars" aria-hidden="true" />;
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
          <span className="game-overlay__label">TIP</span>
          <strong className="game-overlay__tip-copy">
            Press <span className="game-overlay__shortcut">Ctrl - (minus)</span> to make the HUD buttons smaller! And <span className="game-overlay__shortcut">Ctrl +</span> to make them bigger.
          </strong>
        </div>

        <div className="game-overlay__hud game-overlay__hud--top-right game-overlay__hud--actions">
          <button
            type="button"
            className="game-overlay__button game-overlay__button--icon"
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? '🗗' : '⛶'}
          </button>
          <button
            type="button"
            className="game-overlay__button game-overlay__button--danger game-overlay__button--icon"
            onClick={handleClose}
            aria-label="Close game"
            title="Close game"
          >
            ✕
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

function AnnouncementsModal({ announcement, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const title = announcement?.title || 'Announcements';
  const message = typeof announcement?.message === 'string'
    ? announcement.message
    : 'No announcement available right now.';
  const updatedAt = announcement?.updatedAt ? new Date(announcement.updatedAt) : null;
  const updatedLabel = updatedAt && !Number.isNaN(updatedAt.getTime())
    ? updatedAt.toLocaleString()
    : '';

  return (
    <div
      className="announcements-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcements-modal-title"
      onClick={onClose}
    >
      <div className="announcements-modal__panel" onClick={(event) => event.stopPropagation()}>
        <header className="announcements-modal__header">
          <div>
            <span className="announcements-modal__eyebrow">DeblockedX</span>
            <h2 id="announcements-modal-title">{title}</h2>
          </div>
          <button
            type="button"
            className="announcements-modal__close"
            onClick={onClose}
            aria-label="Close announcements"
          >
            ×
          </button>
        </header>
        <div className="announcements-modal__body">
          {message.split('\n').map((line, index) => (
            line.trim()
              ? <p key={index}>{line}</p>
              : <span key={index} className="announcements-modal__spacer" aria-hidden="true" />
          ))}
        </div>
        {updatedLabel && (
          <footer className="announcements-modal__footer">
            <span>Updated {updatedLabel}</span>
          </footer>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const secretConfig = useMemo(() => normalizeSecretConfig(secretData), []);
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
  const [customThemeImage, setCustomThemeImage] = useState(() => loadStorageValue(CUSTOM_THEME_IMAGE_KEY, ''));
  const [backgroundAudioDataUrl, setBackgroundAudioDataUrl] = useState(() => loadStorageValue(BACKGROUND_AUDIO_KEY, ''));
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
  const [activePage, setActivePage] = useState('games');
  const [activeGame, setActiveGame] = useState(null);
  const [gamesLibrary, setGamesLibrary] = useState(() => {
    const stored = loadStorageValue(GAMES_LIBRARY_PREF_KEY, 'main');
    return stored === 'second' ? 'second' : 'main';
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [activeSettingsSection, setActiveSettingsSection] = useState('appearance');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSettingsChangeAt, setLastSettingsChangeAt] = useState(Date.now());
  const [cloakOnStartup, setCloakOnStartup] = useState(() => {
    const stored = loadStorageValue(CLOAK_PREF_KEY, '');
    return stored === '' ? true : stored === 'true';
  });
  const clickAudioRef = useRef(null);
  const backgroundAudioRef = useRef(null);

  const announcement = useMemo(() => {
    if (!announcementsData || typeof announcementsData !== 'object') return null;
    return announcementsData;
  }, []);

  const announcementVersion = announcement?.updatedAt
    || (announcement?.version != null ? `v${announcement.version}` : '');

  useEffect(() => {
    if (!announcement) return;
    if (!announcementVersion) return;

    const lastSeen = loadStorageValue(ANNOUNCEMENT_SEEN_KEY, '');
    if (lastSeen === announcementVersion) return;

    const publishedAt = announcement.updatedAt
      ? new Date(announcement.updatedAt).getTime()
      : 0;
    if (publishedAt && Date.now() < publishedAt + ANNOUNCEMENT_DELAY_MS) return;

    setAnnouncementsOpen(true);
    saveStorageValue(ANNOUNCEMENT_SEEN_KEY, announcementVersion);
  }, [announcement, announcementVersion]);

  useEffect(() => {
    saveStorageValue(SETTINGS_PREF_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    saveStorageValue(CLICK_SOUND_KEY, clickSoundDataUrl);
  }, [clickSoundDataUrl]);

  useEffect(() => {
    saveStorageValue(CUSTOM_THEME_IMAGE_KEY, customThemeImage);
  }, [customThemeImage]);

  useEffect(() => {
    saveStorageValue(BACKGROUND_AUDIO_KEY, backgroundAudioDataUrl);
  }, [backgroundAudioDataUrl]);

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
    saveStorageValue(GAMES_LIBRARY_PREF_KEY, gamesLibrary);
  }, [gamesLibrary]);

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
    const audio = backgroundAudioRef.current;
    if (!audio || !backgroundAudioDataUrl) return;
    if (!settings.enableBackgroundAudio) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }
    audio.loop = true;
    audio.play().catch(() => {});
  }, [backgroundAudioDataUrl, settings.enableBackgroundAudio]);

  const masonryItems = useMemo(
    () => {
      const secretGames = Array.isArray(secretConfig.games) ? secretConfig.games : [];
      const completeGames = secretUnlocked ? [...secretGames, ...gamesData] : gamesData;
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
   }, [secretUnlocked, favoriteGameIds, gamesData, secretConfig, settings.gameCardAspect]);


  const navItems = useMemo(
    () => [
      {
        label: 'Games',
        bgColor: activePage === 'games' ? '#1a2235' : '#111827',
        textColor: '#fff',
        links: [{ label: 'Tip: to make the Peformance Buttons in games smaller, you can Always press CTRL SHIFT MINUS/PLUS ', ariaLabel: 'Tip: to make the Peformance Buttons in games smaller, you can Always press CTRL SHIFT MINUS/PLUS', page: 'games' }],
      },
      {
        label: 'Minecraft Server',
        bgColor: activePage === 'minecraft' ? '#1d2a26' : '#161e1c',
        textColor: '#fff',
        links: [
          { label: 'Server Address & Ports', ariaLabel: 'Open School Minecraft Server page', page: 'minecraft' },
          { label: 'Java + Bedrock + Console', ariaLabel: 'Open School Minecraft Server page', page: 'minecraft' },
        ],
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

  const totalGameAmount = filteredMasonryItems.length + 1000;

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
    if (target === 'background') setBackgroundAudioDataUrl(dataUrl);
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
    if (!secretConfig?.code) {
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

    const expectedCode = secretConfig.code.trim().toUpperCase();
    if (submittedCode === expectedCode) {
      setSecretUnlocked(true);
      setCodeStatus('✅ Code accepted. Secret games unlocked at the top.');
      setCodeInput('');
      return;
    }

    setCodeStatus('❌ Invalid code.');
  };

  const [copyStatus, setCopyStatus] = useState('');
  const handleCopyServerValue = async (value, label) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(`Copied ${label}`);
    } catch {
      setCopyStatus(`Could not copy ${label}`);
    }
    window.setTimeout(() => setCopyStatus(''), 1800);
  };

  const gamesPage = (
    <section className="games-page games-page--compact">
      <div className="library-switcher" role="tablist" aria-label="Choose game library">
        <button
          type="button"
          role="tab"
          aria-selected={gamesLibrary === 'main'}
          className={`library-switcher__tab${gamesLibrary === 'main' ? ' library-switcher__tab--active' : ''}`}
          onClick={() => setGamesLibrary('main')}
        >
          <span className="library-switcher__dot" aria-hidden="true" />
          <span className="library-switcher__label">Main games</span>
          <span className="library-switcher__hint">Script-loaded library</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={gamesLibrary === 'second'}
          className={`library-switcher__tab${gamesLibrary === 'second' ? ' library-switcher__tab--active' : ''}`}
          onClick={() => setGamesLibrary('second')}
        >
          <span className="library-switcher__dot" aria-hidden="true" />
          <span className="library-switcher__label">Second Set of Games</span>
          <span className="library-switcher__hint">Curated games.json</span>
        </button>
        <span
          className={`library-switcher__indicator library-switcher__indicator--${gamesLibrary}`}
          aria-hidden="true"
        />
      </div>

      {gamesLibrary === 'main' ? (
        <SecondLibraryGames />
      ) : (
        <Masonry
          items={filteredMasonryItems}
          onItemClick={setActiveGame}
          onToggleFavorite={handleToggleFavoriteGame}
          stagger={0.05}
          hoverScale={0.97}
          alwaysShowTitles={settings.alwaysShowGameTitles}
          iconShape={settings.gameIconShape}
          iconDensity={settings.gameIconDensity}
        />
      )}
    </section>
  );

  const minecraftPage = (
    <section className="minecraft-page">
      <div className="minecraft-page__content">
        <header className="minecraft-page__intro">
          <h1>School Minecraft Server</h1>
          <p className="minecraft-page__sub">Paid · Crossplay · All versions · No mods.</p>
        </header>

        <div className="minecraft-section">
          <p className="minecraft-section__label">In-game server browser</p>
          <div className="minecraft-grid minecraft-grid--pair">
            <article className="minecraft-card minecraft-card--java">
              <span className="minecraft-card__chip">Java</span>
              <h2>Java Edition</h2>
              <div className="server-info__row">
                <dt>Address</dt>
                <dd>
                  <code>{MINECRAFT_SERVER.java.combined}</code>
                  <button
                    type="button"
                    className="copy-button"
                    onClick={() => handleCopyServerValue(MINECRAFT_SERVER.java.combined, 'Java address')}
                  >
                    Copy
                  </button>
                </dd>
              </div>
            </article>

            <article className="minecraft-card minecraft-card--bedrock">
              <span className="minecraft-card__chip">Bedrock</span>
              <h2>Bedrock Edition (PC / Mobile)</h2>
              <div className="server-info__row">
                <dt>Address</dt>
                <dd>
                  <code>{MINECRAFT_SERVER.bedrock.address}</code>
                  <button
                    type="button"
                    className="copy-button"
                    onClick={() => handleCopyServerValue(MINECRAFT_SERVER.bedrock.address, 'Bedrock address')}
                  >
                    Copy
                  </button>
                </dd>
              </div>
              <div className="server-info__row">
                <dt>Port</dt>
                <dd>
                  <code>{MINECRAFT_SERVER.bedrock.port}</code>
                  <button
                    type="button"
                    className="copy-button"
                    onClick={() => handleCopyServerValue(MINECRAFT_SERVER.bedrock.port, 'Bedrock port')}
                  >
                    Copy
                  </button>
                </dd>
              </div>
            </article>
          </div>
        </div>

        <hr className="minecraft-divider" aria-hidden="true" />

        <div className="minecraft-section">
          <p className="minecraft-section__label">Different join method — read this</p>
          <article className="minecraft-card minecraft-card--console minecraft-card--full">
            <span className="minecraft-card__chip">Console</span>
            <h2>Xbox · PlayStation · Switch</h2>
            <p className="minecraft-card__copy">
              Consoles can't type a server address directly. Use the workaround below:
            </p>
            <ol className="minecraft-card__steps">
              <li>On your phone, install <strong>Bedrock Together</strong> or <strong>Bedrock Connect</strong> (App Store / Google Play).</li>
              <li>Open the app and enter the server address &amp; port below.</li>
              <li>Make sure your phone and console are on the <strong>same Wi-Fi</strong>.</li>
              <li>On the console, go to <strong>Play → Friends → LAN Games</strong>. The server will be listed.</li>
            </ol>
            <div className="server-info__row">
              <dt>Address</dt>
              <dd>
                <code>{MINECRAFT_SERVER.bedrock.address}</code>
                <button
                  type="button"
                  className="copy-button"
                  onClick={() => handleCopyServerValue(MINECRAFT_SERVER.bedrock.address, 'Console address')}
                >
                  Copy
                </button>
              </dd>
            </div>
            <div className="server-info__row">
              <dt>Port</dt>
              <dd>
                <code>{MINECRAFT_SERVER.bedrock.port}</code>
                <button
                  type="button"
                  className="copy-button"
                  onClick={() => handleCopyServerValue(MINECRAFT_SERVER.bedrock.port, 'Console port')}
                >
                  Copy
                </button>
              </dd>
            </div>
          </article>
        </div>

        {copyStatus && <p className="minecraft-page__toast" role="status">{copyStatus}</p>}
      </div>
    </section>
  );

  const activeNavCardItems = (
    <CardNav
      title="deblocked"
      items={navItems}
      activePage={activePage}
      onNavigate={setActivePage}
      showCompactSearch={activePage === 'games' && gamesLibrary === 'second'}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchResultCount={totalGameAmount}
      onOpenSettings={() => setSettingsOpen(true)}
      onOpenAnnouncements={() => setAnnouncementsOpen(true)}
      baseColor="var(--nav-surface)"
      menuColor="#ffffff"
      ease="power3.out"
    />
  );

  return (
    <main
      className={`app-shell app-shell--${activePage}${settings.performanceMode ? ' app-shell--performance' : ''}${settings.themePreset === 'light' ? ' app-shell--light' : ''}`}
      style={{
        '--page-gradient-from': activeTheme.pageFrom,
        '--page-gradient-to': activeTheme.pageTo,
        '--page-gradient-angle': settings.gradientDirection === 'horizontal' ? '90deg' : '180deg',
        '--page-image': settings.themeMode === 'image' && customThemeImage ? `url(${customThemeImage})` : 'none',
        '--nav-surface': activeTheme.card,
        '--panel-surface': activeTheme.panel,
        '--accent-color': activeAccent,
      }}
    >
      {clickSoundDataUrl && <audio ref={clickAudioRef} src={clickSoundDataUrl} preload="auto" />}
      {backgroundAudioDataUrl && <audio ref={backgroundAudioRef} src={backgroundAudioDataUrl} preload="auto" />}
      {settings.dynamicStarsEnabled && (
        <DynamicStars
          enabled={settings.dynamicStarsEnabled}
          direction={settings.dynamicStarsDirection}
          origin={settings.dynamicStarsOrigin}
          size={settings.dynamicStarsSize}
          connectMode={settings.dynamicStarsConnectMode}
        />
      )}
      {!activeGame && (
        <section className="main-content main-content--intro-ready">
          <div className="main-background main-background--games">
            <div className="games-backdrop" aria-hidden="true" />
          </div>

          {isAnimationEnabled ? (
            <ClickSpark sparkColor="#fff" sparkSize={7} sparkRadius={30} sparkCount={8} duration={400}>
              <section className="page-shell">
                {activeNavCardItems}
                {activePage === 'games' ? gamesPage : minecraftPage}
              </section>
            </ClickSpark>
          ) : (
            <section className="page-shell">
              {activeNavCardItems}
              {activePage === 'games' ? gamesPage : minecraftPage}
            </section>
          )}
        </section>
      )}

      {activeGame && <GameOverlay game={activeGame} onClose={() => setActiveGame(null)} />}

      {announcementsOpen && (
        <AnnouncementsModal
          announcement={announcement}
          onClose={() => setAnnouncementsOpen(false)}
        />
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

            <div className="settings-layout">
              <aside className="settings-sidebar">
                {[
                  ['appearance', 'Themes'],
                  ['games', 'Games'],
                  ['flow', 'Flow'],
                  ['audio', 'Audio'],
                  ['stealth', 'Stealth'],
                  ['secret', 'Secret'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`settings-nav-button${activeSettingsSection === id ? ' settings-nav-button--active' : ''}`}
                    onClick={() => setActiveSettingsSection(id)}
                  >
                    {label}
                  </button>
                ))}
              </aside>

              <div className="settings-content settings-content--single">
              {activeSettingsSection === 'appearance' && (
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
                      <div className="settings-direction-row">
                        <span>Gradient direction</span>
                        <div className="settings-chip-row">
                          <button type="button" className={`settings-chip${settings.gradientDirection === 'vertical' ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('gradientDirection', 'vertical')}>Vertical</button>
                          <button type="button" className={`settings-chip${settings.gradientDirection === 'horizontal' ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('gradientDirection', 'horizontal')}>Horizontal</button>
                        </div>
                      </div>
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
                <div className="settings-subsection">
                  <h4>Dynamic stars</h4>
                  <SettingsToggle
                    id="dynamic-stars-toggle"
                    checked={settings.dynamicStarsEnabled}
                    onChange={(event) => updateSetting('dynamicStarsEnabled', event.target.checked)}
                  >
                    Enable falling stars overlay
                  </SettingsToggle>
                  <div className="settings-chip-row">
                    {['down', 'up', 'left', 'right'].map((direction) => (
                      <button key={direction} type="button" className={`settings-chip${settings.dynamicStarsDirection === direction ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('dynamicStarsDirection', direction)}>
                        {direction}
                      </button>
                    ))}
                  </div>
                  <div className="settings-chip-row">
                    {['top', 'bottom', 'left', 'right'].map((side) => (
                      <button key={side} type="button" className={`settings-chip${settings.dynamicStarsOrigin === side ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('dynamicStarsOrigin', side)}>
                        From {side}
                      </button>
                    ))}
                  </div>
                  <div className="settings-chip-row">
                    {['small', 'medium', 'large'].map((starSize) => (
                      <button key={starSize} type="button" className={`settings-chip${settings.dynamicStarsSize === starSize ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('dynamicStarsSize', starSize)}>
                        {starSize}
                      </button>
                    ))}
                  </div>
                  <SettingsToggle
                    id="dynamic-stars-lines-toggle"
                    checked={settings.dynamicStarsConnectMode}
                    onChange={(event) => updateSetting('dynamicStarsConnectMode', event.target.checked)}
                  >
                    Connect nearby stars with thin lines
                  </SettingsToggle>
                </div>
              </section>
              )}

              {activeSettingsSection === 'games' && (
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
                  <h4>Game icon shape</h4>
                  <div className="settings-chip-row">
                    <button type="button" className={`settings-chip${settings.gameIconShape === 'default' ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('gameIconShape', 'default')}>Default</button>
                    <button type="button" className={`settings-chip${settings.gameIconShape === 'rounded-rect' ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('gameIconShape', 'rounded-rect')}>Rounded Rect</button>
                    <button type="button" className={`settings-chip${settings.gameIconShape === 'circle' ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('gameIconShape', 'circle')}>Circle</button>
                    <button type="button" className={`settings-chip${settings.gameIconShape === 'diamond' ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('gameIconShape', 'diamond')}>Diamond</button>
                    <button type="button" className={`settings-chip${settings.gameIconShape === 'hex' ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('gameIconShape', 'hex')}>Hex</button>
                  </div>
                </div>
                <div className="settings-subsection">
                  <h4>Game icon spacing mode</h4>
                  <div className="settings-chip-row">
                    <button type="button" className={`settings-chip${settings.gameIconDensity === 'default' ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('gameIconDensity', 'default')}>Default</button>
                    <button type="button" className={`settings-chip${settings.gameIconDensity === 'compact' ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('gameIconDensity', 'compact')}>Compact</button>
                    <button type="button" className={`settings-chip${settings.gameIconDensity === 'cozy' ? ' settings-chip--active' : ''}`} onClick={() => updateSetting('gameIconDensity', 'cozy')}>Cozy</button>
                  </div>
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
              )}

              {activeSettingsSection === 'flow' && (
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
              )}

              {activeSettingsSection === 'audio' && (
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
                <h3>Background looping audio</h3>
                <SettingsToggle
                  id="enable-background-audio-toggle"
                  checked={settings.enableBackgroundAudio}
                  onChange={(event) => updateSetting('enableBackgroundAudio', event.target.checked)}
                >
                  Enable looping background audio
                </SettingsToggle>
                <label className="settings-upload">
                  <span>Upload background audio (mp3)</span>
                  <input type="file" accept="audio/mpeg,audio/mp3,audio/*" onChange={(event) => handleAudioFileUpload(event, 'background')} />
                </label>
              </section>
              )}

              {activeSettingsSection === 'stealth' && (
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
              )}

              {activeSettingsSection === 'secret' && (
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
              )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
