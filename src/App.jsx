import { useEffect, useMemo, useRef, useState } from 'react';
import PillNav from './PillNav';
import ClickSpark from './ClickSpark';
import Masonry from './Masonry';
import StreamHome from './StreamHome';
import { readPlayCounts, recordPlay } from './streamRows';
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
  dynamicStarsDensity: 'medium',
  dynamicStarsSpeed: 'medium',
  dynamicStarsTwinkle: false,
  enableBackgroundAudio: false,
  uiRoundness: 'soft',
  uiDensity: 'comfortable',
  uiFont: 'inter',
  uiScale: 100,
  reduceMotion: false,
  accentGlow: true,
  backgroundDim: 32,
  cardHoverEffect: 'lift',
  favoriteIconStyle: 'star',
  showPlayBadge: true,
  retroScanlines: false,
  headingFont: 'arcade',
};

const THEME_PRESETS = {
  midnight: { pageFrom: '#050816', pageTo: '#03040a', card: 'rgba(6, 10, 20, 0.92)', panel: 'rgba(9, 14, 28, 0.96)' },
  nebula: { pageFrom: '#1b1035', pageTo: '#0a122d', card: 'rgba(19, 11, 43, 0.92)', panel: 'rgba(19, 15, 46, 0.96)' },
  graphite: { pageFrom: '#10151f', pageTo: '#05070d', card: 'rgba(17, 23, 35, 0.92)', panel: 'rgba(17, 22, 34, 0.96)' },
  sunset: { pageFrom: '#3f1b2f', pageTo: '#140b20', card: 'rgba(47, 21, 38, 0.92)', panel: 'rgba(44, 17, 38, 0.96)' },
  ocean: { pageFrom: '#0b2d44', pageTo: '#03131f', card: 'rgba(8, 34, 50, 0.92)', panel: 'rgba(8, 30, 45, 0.96)' },
  forest: { pageFrom: '#0d2b1d', pageTo: '#04120b', card: 'rgba(8, 30, 21, 0.92)', panel: 'rgba(9, 32, 23, 0.96)' },
  ember: { pageFrom: '#2b150d', pageTo: '#120704', card: 'rgba(36, 17, 10, 0.92)', panel: 'rgba(38, 18, 11, 0.96)' },
  light: { pageFrom: '#eff5ff', pageTo: '#dee8ff', card: 'rgba(255, 255, 255, 0.9)', panel: 'rgba(247, 251, 255, 0.95)' },
};

const ACCENT_PRESETS = {
  cyan: '#58d4ff',
  violet: '#b789ff',
  lime: '#9bf44f',
  rose: '#ff7ba7',
  amber: '#ffc65c',
  mint: '#67f0cb',
  sky: '#7ab2ff',
  coral: '#ff8e6e',
};

const UI_FONTS = {
  inter: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  gaming: "'Chakra Petch', 'Inter', system-ui, sans-serif",
  system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  serif: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

const HEADING_FONTS = {
  arcade: "'Russo One', 'Chakra Petch', Inter, system-ui, sans-serif",
  match: 'inherit',
};

const UI_ROUNDNESS = {
  sharp: { sm: '6px', md: '10px', lg: '14px', pill: '14px' },
  soft: { sm: '10px', md: '14px', lg: '20px', pill: '999px' },
  round: { sm: '14px', md: '20px', lg: '28px', pill: '999px' },
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

function SecondLibraryGames() {
  const containerRef = useRef(null);
  const [embedError, setEmbedError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
        if (isActive) setIsLoading(false);
      } catch {
        if (!isActive) return;
        setIsLoading(false);
        setEmbedError('Could not load the games library right now.');
      }
    };

    initLibrary();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="second-library" aria-label="Main games library">
      {isLoading && !embedError && (
        <div className="library-skeleton" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, index) => (
            <span key={index} className="library-skeleton__tile" style={{ animationDelay: `${(index % 6) * 90}ms` }} />
          ))}
        </div>
      )}
      <div ref={containerRef} className="second-library__embed" />
      {embedError && (
        <div className="second-library__error" role="alert">
          <p>{embedError}</p>
          <button type="button" className="games-empty__action" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}
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

function SettingsToggle({ checked, onChange, children, hint, id }) {
  return (
    <label className="settings-toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} />
      <span className="settings-toggle__track" aria-hidden="true">
        <span className="settings-toggle__thumb" />
      </span>
      <span className="settings-toggle__text">
        <span>{children}</span>
        {hint ? <small className="settings-toggle__hint">{hint}</small> : null}
      </span>
    </label>
  );
}

function SettingsChipRow({ label, options, value, onChange }) {
  return (
    <div className="settings-field" role="group" aria-label={label}>
      {label ? <span className="settings-field__label">{label}</span> : null}
      <div className="settings-chip-row">
        {options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;
          return (
            <button
              key={optionValue}
              type="button"
              aria-pressed={value === optionValue}
              className={`settings-chip${value === optionValue ? ' settings-chip--active' : ''}`}
              onClick={() => onChange(optionValue)}
            >
              {optionLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DynamicStars({
  enabled,
  direction = 'down',
  origin = 'top',
  size = 'medium',
  density = 'medium',
  speed = 'medium',
  twinkle = false,
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
    const speedMultiplier = speed === 'slow' ? 0.55 : speed === 'fast' ? 1.8 : 1;
    const densityDivisor = density === 'low' ? 38000 : density === 'high' ? 13000 : 22000;
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const starCount = Math.max(60, Math.floor((canvas.width * canvas.height) / densityDivisor));
      stars.length = 0;

      for (let index = 0; index < starCount; index += 1) {
        const radius = (Math.random() * 1.8 + 0.7) * sizeMultiplier;
        const starSpeed = (Math.random() * 0.8 + 0.3) * sizeMultiplier * speedMultiplier;
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        if (origin === 'top') y = -Math.random() * canvas.height;
        if (origin === 'bottom') y = canvas.height + Math.random() * canvas.height;
        if (origin === 'left') x = -Math.random() * canvas.width;
        if (origin === 'right') x = canvas.width + Math.random() * canvas.width;
        stars.push({ x, y, radius, speed: starSpeed, phase: Math.random() * Math.PI * 2 });
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

    const render = (timestamp) => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        if (direction === 'down') star.y += star.speed;
        if (direction === 'up') star.y -= star.speed;
        if (direction === 'left') star.x -= star.speed;
        if (direction === 'right') star.x += star.speed;

        if (star.x < -30 || star.x > canvas.width + 30 || star.y < -30 || star.y > canvas.height + 30) {
          resetStar(star);
        }

        const alpha = twinkle
          ? 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(timestamp * 0.0024 + star.phase))
          : 0.85;
        context.beginPath();
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
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

    const handleVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(animationFrameId);
      } else {
        animationFrameId = window.requestAnimationFrame(render);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', handleVisibility);
    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [connectMode, density, direction, enabled, origin, size, speed, twinkle]);

  return <canvas ref={canvasRef} className="dynamic-stars" aria-hidden="true" />;
}

function GameOverlay({ game, onClose }) {
  const [fps, setFps] = useState(0);
  const [battery, setBattery] = useState('—');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);
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
      }).catch(() => setBattery('—'));
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

  useEffect(() => {
    const timer = window.setTimeout(() => setTipDismissed(true), 12000);
    return () => window.clearTimeout(timer);
  }, []);

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
          <span className="game-overlay__title">{game.title}</span>
          {!tipDismissed && (
            <span className="game-overlay__tip">
              <span className="game-overlay__shortcut">Ctrl −</span> / <span className="game-overlay__shortcut">Ctrl +</span> resizes the HUD
              <button
                type="button"
                className="game-overlay__tip-dismiss"
                onClick={() => setTipDismissed(true)}
                aria-label="Dismiss tip"
              >
                ✕
              </button>
            </span>
          )}
        </div>

        <div className="game-overlay__hud game-overlay__hud--top-right">
          <button
            type="button"
            className="game-overlay__button"
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {isFullscreen ? (
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              ) : (
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              )}
            </svg>
          </button>
          <button
            type="button"
            className="game-overlay__button game-overlay__button--danger"
            onClick={handleClose}
            aria-label="Close game"
            title="Close game"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="game-overlay__hud game-overlay__hud--bottom-left">
          <span className="game-overlay__stat">
            <span className="game-overlay__label">FPS</span>
            <strong>{fps || '…'}</strong>
          </span>
          <span className="game-overlay__stat">
            <span className="game-overlay__label">Battery</span>
            <strong>{battery}</strong>
          </span>
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

const ICON_PATHS = {
  interface: <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Zm6-2v18" />,
  appearance: <><circle cx="12" cy="12" r="9" /><path d="M12 3v18a9 9 0 0 0 0-18Z" fill="currentColor" stroke="none" /></>,
  games: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  audio: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15 9a3 3 0 0 1 0 6" /><path d="M18 6a7 7 0 0 1 0 12" /></>,
  stealth: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  secret: <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 22l-5.2-2.9 1-5.8L3.5 9.2l5.9-.9L12 3Z" />,
};

function SettingsIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  );
}

const SETTINGS_SECTIONS = [
  { id: 'interface', label: 'Interface', blurb: 'Layout, motion, and feel' },
  { id: 'appearance', label: 'Themes', blurb: 'Colors, background, and stars' },
  { id: 'games', label: 'Games', blurb: 'How the library looks' },
  { id: 'audio', label: 'Audio', blurb: 'Clicks and background sound' },
  { id: 'stealth', label: 'Stealth', blurb: 'Cloaking tools' },
  { id: 'secret', label: 'Secret', blurb: 'Unlock hidden games' },
];

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
    const stored = loadStorageValue(GAMES_LIBRARY_PREF_KEY, 'stream');
    return stored === 'second' || stored === 'main' ? stored : 'stream';
  });
  const [playCounts, setPlayCounts] = useState(() => readPlayCounts());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [activeSettingsSection, setActiveSettingsSection] = useState('interface');
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
    const scale = Number(settings.uiScale);
    const safeScale = Number.isFinite(scale) ? Math.min(115, Math.max(85, scale)) : 100;
    document.documentElement.style.fontSize = safeScale === 100 ? '' : `${(safeScale / 100) * 16}px`;
    return () => {
      document.documentElement.style.fontSize = '';
    };
  }, [settings.uiScale]);

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


  const isAnimationEnabled = settings.enableAnimations && !settings.performanceMode && !settings.reduceMotion;
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
  const roundness = UI_ROUNDNESS[settings.uiRoundness] ?? UI_ROUNDNESS.soft;
  const uiFontStack = UI_FONTS[settings.uiFont] ?? UI_FONTS.inter;
  const headingFontStack = HEADING_FONTS[settings.headingFont] ?? HEADING_FONTS.arcade;
  const backgroundDim = Math.min(80, Math.max(0, Number(settings.backgroundDim) || 0));

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

  const handleResetSettings = () => {
    setLastSettingsChangeAt(Date.now());
    setSettings(DEFAULT_SETTINGS);
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

  /* Play counts drive the Top 10 row. Kept in state as well as localStorage so
   * the row reorders without a reload. */
  const handlePlayGame = (game) => {
    setActiveGame(game);
    setPlayCounts(recordPlay(game?.id));
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

  const [copiedKey, setCopiedKey] = useState('');
  const copyResetTimer = useRef(null);
  const handleCopyServerValue = async (value, key) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
    } catch {
      setCopiedKey('');
    }
    if (copyResetTimer.current) window.clearTimeout(copyResetTimer.current);
    copyResetTimer.current = window.setTimeout(() => setCopiedKey(''), 1800);
  };

  const renderCopyButton = (value, key, label) => (
    <button
      type="button"
      className={`copy-button${copiedKey === key ? ' copy-button--copied' : ''}`}
      onClick={() => handleCopyServerValue(value, key)}
      aria-label={`Copy ${label}`}
    >
      {copiedKey === key ? '✓ Copied' : 'Copy'}
    </button>
  );

  const gamesPage = (
    <section className="games-page games-page--compact">
      <div className="library-switcher" role="tablist" aria-label="Choose game library">
        <button
          type="button"
          role="tab"
          aria-selected={gamesLibrary === 'stream'}
          className={`library-switcher__tab${gamesLibrary === 'stream' ? ' library-switcher__tab--active' : ''}`}
          onClick={() => setGamesLibrary('stream')}
        >
          <span className="library-switcher__dot" aria-hidden="true" />
          <span className="library-switcher__label">Games</span>
          <span className="library-switcher__hint">Full library</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={gamesLibrary === 'main'}
          className={`library-switcher__tab${gamesLibrary === 'main' ? ' library-switcher__tab--active' : ''}`}
          onClick={() => setGamesLibrary('main')}
        >
          <span className="library-switcher__dot" aria-hidden="true" />
          <span className="library-switcher__label">Extra games</span>
          <span className="library-switcher__hint">External set</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={gamesLibrary === 'second'}
          className={`library-switcher__tab${gamesLibrary === 'second' ? ' library-switcher__tab--active' : ''}`}
          onClick={() => setGamesLibrary('second')}
        >
          <span className="library-switcher__dot" aria-hidden="true" />
          <span className="library-switcher__label">Classic</span>
          <span className="library-switcher__hint">Old library</span>
        </button>
        <span
          className={`library-switcher__indicator library-switcher__indicator--${gamesLibrary}`}
          aria-hidden="true"
        />
      </div>

      {gamesLibrary === 'stream' ? (
        <StreamHome
          onPlay={handlePlayGame}
          favoriteIds={favoriteGameIds}
          onToggleFavorite={handleToggleFavoriteGame}
          searchQuery={searchQuery}
          playCounts={playCounts}
          reduceMotion={settings.reduceMotion || settings.performanceMode}
        />
      ) : gamesLibrary === 'main' ? (
        <SecondLibraryGames />
      ) : filteredMasonryItems.length === 0 && searchQuery.trim() ? (
        <div className="games-empty" role="status">
          <div className="games-empty__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <h3>No games match “{searchQuery.trim()}”</h3>
          <p>Try a different name, or clear the search to see everything.</p>
          <button type="button" className="games-empty__action" onClick={() => setSearchQuery('')}>
            Clear search
          </button>
        </div>
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
          hoverEffect={settings.cardHoverEffect}
          favoriteIconStyle={settings.favoriteIconStyle}
          showPlayBadge={settings.showPlayBadge}
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
                  {renderCopyButton(MINECRAFT_SERVER.java.combined, 'java-address', 'Java address')}
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
                  {renderCopyButton(MINECRAFT_SERVER.bedrock.address, 'bedrock-address', 'Bedrock address')}
                </dd>
              </div>
              <div className="server-info__row">
                <dt>Port</dt>
                <dd>
                  <code>{MINECRAFT_SERVER.bedrock.port}</code>
                  {renderCopyButton(MINECRAFT_SERVER.bedrock.port, 'bedrock-port', 'Bedrock port')}
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
                {renderCopyButton(MINECRAFT_SERVER.bedrock.address, 'console-address', 'Console address')}
              </dd>
            </div>
            <div className="server-info__row">
              <dt>Port</dt>
              <dd>
                <code>{MINECRAFT_SERVER.bedrock.port}</code>
                {renderCopyButton(MINECRAFT_SERVER.bedrock.port, 'console-port', 'Console port')}
              </dd>
            </div>
          </article>
        </div>
      </div>
    </section>
  );

  const activeNavCardItems = (
    <PillNav
      title="deblocked"
      tabs={[
        { page: 'games', label: 'Games', icon: 'games' },
        { page: 'minecraft', label: 'Minecraft', icon: 'minecraft' },
      ]}
      activePage={activePage}
      onNavigate={setActivePage}
      showSearch={activePage === 'games' && (gamesLibrary === 'stream' || gamesLibrary === 'second')}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onOpenSettings={() => setSettingsOpen(true)}
      onOpenAnnouncements={() => setAnnouncementsOpen(true)}
    />
  );

  const shellClassNames = [
    'app-shell',
    `app-shell--${activePage}`,
    settings.performanceMode ? 'app-shell--performance' : '',
    settings.reduceMotion ? 'app-shell--reduced-motion' : '',
    settings.themePreset === 'light' && settings.themeMode === 'preset' ? 'app-shell--light' : '',
    settings.uiDensity === 'compact' ? 'app-shell--compact' : '',
    settings.accentGlow ? 'app-shell--glow' : '',
  ].filter(Boolean).join(' ');

  return (
    <main
      className={shellClassNames}
      style={{
        '--page-gradient-from': activeTheme.pageFrom,
        '--page-gradient-to': activeTheme.pageTo,
        '--page-gradient-angle': settings.gradientDirection === 'horizontal' ? '90deg' : '180deg',
        '--page-image': settings.themeMode === 'image' && customThemeImage ? `url(${customThemeImage})` : 'none',
        '--nav-surface': activeTheme.card,
        '--panel-surface': activeTheme.panel,
        '--accent-color': activeAccent,
        '--ui-radius-sm': roundness.sm,
        '--ui-radius-md': roundness.md,
        '--ui-radius-lg': roundness.lg,
        '--ui-radius-pill': roundness.pill,
        '--ui-font': uiFontStack,
        '--heading-font': headingFontStack,
        '--background-dim': backgroundDim / 100,
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
          density={settings.dynamicStarsDensity}
          speed={settings.dynamicStarsSpeed}
          twinkle={settings.dynamicStarsTwinkle}
          connectMode={settings.dynamicStarsConnectMode}
        />
      )}
      {settings.retroScanlines && !settings.reduceMotion && <div className="scanline-overlay" aria-hidden="true" />}
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

      {copiedKey && <p className="copy-toast" role="status">Copied to clipboard</p>}

      {announcementsOpen && (
        <AnnouncementsModal
          announcement={announcement}
          onClose={() => setAnnouncementsOpen(false)}
        />
      )}

      {settingsOpen && (
        <div className="settings-modal" role="dialog" aria-modal="true" aria-label="Settings" onClick={() => setSettingsOpen(false)}>
          <div
            className={`settings-modal__panel${isAnimationEnabled ? ' settings-modal__panel--animated' : ''}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="settings-modal__header">
              <div>
                <h2>Settings</h2>
                <p className="settings-status">Saved automatically · Last change {new Date(lastSettingsChangeAt).toLocaleTimeString()}</p>
              </div>
              <div className="settings-modal__header-actions">
                <button type="button" className="settings-reset" onClick={handleResetSettings}>
                  Reset all
                </button>
                <button type="button" className="settings-modal__close" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                  ×
                </button>
              </div>
            </header>

            <div className="settings-layout">
              <aside className="settings-sidebar" role="tablist" aria-label="Settings sections">
                {SETTINGS_SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    role="tab"
                    aria-selected={activeSettingsSection === section.id}
                    className={`settings-nav-button${activeSettingsSection === section.id ? ' settings-nav-button--active' : ''}`}
                    onClick={() => setActiveSettingsSection(section.id)}
                  >
                    <span className="settings-nav-button__icon" aria-hidden="true"><SettingsIcon name={section.id} /></span>
                    <span className="settings-nav-button__text">
                      <span>{section.label}</span>
                      <small>{section.blurb}</small>
                    </span>
                  </button>
                ))}
              </aside>

              <div className="settings-content settings-content--single">
              {activeSettingsSection === 'interface' && (
                <section className="settings-block">
                  <h3>Interface</h3>
                  <p className="settings-copy">Fine-tune how the whole site feels — corners, spacing, type, and motion.</p>
                  <div className="settings-subsection">
                    <h4>Look &amp; feel</h4>
                    <SettingsChipRow
                      label="Corner roundness"
                      options={[
                        { value: 'sharp', label: 'Sharp' },
                        { value: 'soft', label: 'Soft' },
                        { value: 'round', label: 'Round' },
                      ]}
                      value={settings.uiRoundness}
                      onChange={(value) => updateSetting('uiRoundness', value)}
                    />
                    <SettingsChipRow
                      label="Density"
                      options={[
                        { value: 'comfortable', label: 'Comfortable' },
                        { value: 'compact', label: 'Compact' },
                      ]}
                      value={settings.uiDensity}
                      onChange={(value) => updateSetting('uiDensity', value)}
                    />
                    <SettingsChipRow
                      label="Body font"
                      options={[
                        { value: 'inter', label: 'Inter' },
                        { value: 'gaming', label: 'Chakra Petch' },
                        { value: 'system', label: 'System' },
                        { value: 'serif', label: 'Serif' },
                        { value: 'mono', label: 'Mono' },
                      ]}
                      value={settings.uiFont}
                      onChange={(value) => updateSetting('uiFont', value)}
                    />
                    <SettingsChipRow
                      label="Heading style"
                      options={[
                        { value: 'arcade', label: 'Arcade (Russo One)' },
                        { value: 'match', label: 'Match body' },
                      ]}
                      value={settings.headingFont}
                      onChange={(value) => updateSetting('headingFont', value)}
                    />
                    <SettingsChipRow
                      label="UI scale"
                      options={[
                        { value: 90, label: '90%' },
                        { value: 95, label: '95%' },
                        { value: 100, label: '100%' },
                        { value: 105, label: '105%' },
                        { value: 110, label: '110%' },
                      ]}
                      value={Number(settings.uiScale)}
                      onChange={(value) => updateSetting('uiScale', value)}
                    />
                  </div>
                  <div className="settings-subsection">
                    <h4>Motion</h4>
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
                        <span>Smooth transitions, hover effects, and animated extras.</span>
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
                      id="reduce-motion-toggle"
                      checked={settings.reduceMotion}
                      onChange={(event) => updateSetting('reduceMotion', event.target.checked)}
                      hint="Keeps the look but calms transitions — good for motion sensitivity."
                    >
                      Reduce motion
                    </SettingsToggle>
                    <SettingsToggle
                      id="smooth-scroll-toggle"
                      checked={settings.smoothScroll}
                      onChange={(event) => updateSetting('smoothScroll', event.target.checked)}
                    >
                      Smooth scrolling
                    </SettingsToggle>
                    <SettingsToggle
                      id="retro-scanlines-toggle"
                      checked={settings.retroScanlines}
                      onChange={(event) => updateSetting('retroScanlines', event.target.checked)}
                      hint="Subtle CRT scanline overlay for a retro-arcade vibe. Auto-off with reduced motion."
                    >
                      Retro scanlines
                    </SettingsToggle>
                  </div>
                </section>
              )}

              {activeSettingsSection === 'appearance' && (
                <section className="settings-block">
                <h3>Themes</h3>
                <p className="settings-copy">Pick a theme style, upload your own background, or create custom colors.</p>
                <div className="settings-subsection">
                  <h4>Theme presets</h4>
                  <div className="settings-theme-grid">
                    {Object.entries(THEME_PRESETS).map(([themeKey, theme]) => (
                      <button
                        key={themeKey}
                        type="button"
                        aria-pressed={settings.themePreset === themeKey}
                        className={`settings-theme-swatch${settings.themePreset === themeKey ? ' settings-theme-swatch--active' : ''}`}
                        onClick={() => {
                          updateSetting('themePreset', themeKey);
                          updateSetting('themeMode', 'preset');
                        }}
                      >
                        <span
                          className="settings-theme-swatch__preview"
                          style={{ background: `linear-gradient(135deg, ${theme.pageFrom}, ${theme.pageTo})` }}
                          aria-hidden="true"
                        />
                        <span className="settings-theme-swatch__name">{themeKey}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="settings-subsection">
                  <h4>Theme source</h4>
                  <SettingsChipRow
                    options={[
                      { value: 'preset', label: 'Preset' },
                      { value: 'solid', label: 'Solid color' },
                      { value: 'gradient', label: '2-color gradient' },
                      { value: 'image', label: 'Image' },
                    ]}
                    value={settings.themeMode}
                    onChange={(value) => updateSetting('themeMode', value)}
                  />
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
                        <SettingsChipRow
                          label="Gradient direction"
                          options={[
                            { value: 'vertical', label: 'Vertical' },
                            { value: 'horizontal', label: 'Horizontal' },
                          ]}
                          value={settings.gradientDirection}
                          onChange={(value) => updateSetting('gradientDirection', value)}
                        />
                      </div>
                    </div>
                  )}
                  <label className="settings-upload">
                    <span>Upload custom theme image</span>
                    <input type="file" accept="image/*" onChange={handleThemeImageUpload} />
                  </label>
                  <label className="settings-range">
                    <span className="settings-field__label">Background dim · {backgroundDim}%</span>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="2"
                      value={backgroundDim}
                      onChange={(event) => updateSetting('backgroundDim', Number(event.target.value))}
                      aria-label="Background dim amount"
                    />
                  </label>
                </div>
                <div className="settings-subsection">
                  <h4>Accent color</h4>
                  <div className="settings-chip-row">
                    {Object.entries(ACCENT_PRESETS).map(([accentKey, accentValue]) => (
                      <button
                        key={accentKey}
                        type="button"
                        aria-pressed={settings.accentPreset === accentKey}
                        className={`settings-chip settings-chip--swatch${settings.accentPreset === accentKey ? ' settings-chip--active' : ''}`}
                        onClick={() => updateSetting('accentPreset', accentKey)}
                      >
                        <span className="settings-chip__dot" style={{ background: accentValue }} aria-hidden="true" />
                        {accentKey}
                      </button>
                    ))}
                    <button
                      type="button"
                      aria-pressed={settings.accentPreset === 'custom'}
                      className={`settings-chip settings-chip--swatch${settings.accentPreset === 'custom' ? ' settings-chip--active' : ''}`}
                      onClick={() => updateSetting('accentPreset', 'custom')}
                    >
                      <span className="settings-chip__dot" style={{ background: settings.customAccent }} aria-hidden="true" />
                      custom
                    </button>
                  </div>
                  {settings.accentPreset === 'custom' && (
                    <label className="settings-color-field">
                      <span>Custom accent</span>
                      <input type="color" value={settings.customAccent} onChange={(event) => updateSetting('customAccent', event.target.value)} />
                    </label>
                  )}
                  <SettingsToggle
                    id="accent-glow-toggle"
                    checked={settings.accentGlow}
                    onChange={(event) => updateSetting('accentGlow', event.target.checked)}
                    hint="Adds a subtle colored glow to active elements."
                  >
                    Accent glow
                  </SettingsToggle>
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
                  <SettingsChipRow
                    label="Direction"
                    options={['down', 'up', 'left', 'right']}
                    value={settings.dynamicStarsDirection}
                    onChange={(value) => updateSetting('dynamicStarsDirection', value)}
                  />
                  <SettingsChipRow
                    label="Spawn from"
                    options={['top', 'bottom', 'left', 'right']}
                    value={settings.dynamicStarsOrigin}
                    onChange={(value) => updateSetting('dynamicStarsOrigin', value)}
                  />
                  <SettingsChipRow
                    label="Star size"
                    options={['small', 'medium', 'large']}
                    value={settings.dynamicStarsSize}
                    onChange={(value) => updateSetting('dynamicStarsSize', value)}
                  />
                  <SettingsChipRow
                    label="Density"
                    options={['low', 'medium', 'high']}
                    value={settings.dynamicStarsDensity}
                    onChange={(value) => updateSetting('dynamicStarsDensity', value)}
                  />
                  <SettingsChipRow
                    label="Speed"
                    options={['slow', 'medium', 'fast']}
                    value={settings.dynamicStarsSpeed}
                    onChange={(value) => updateSetting('dynamicStarsSpeed', value)}
                  />
                  <SettingsToggle
                    id="dynamic-stars-twinkle-toggle"
                    checked={settings.dynamicStarsTwinkle}
                    onChange={(event) => updateSetting('dynamicStarsTwinkle', event.target.checked)}
                  >
                    Twinkle effect
                  </SettingsToggle>
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
                <h3>Games page</h3>
                <p className="settings-copy">Control how the game library is presented.</p>
                <div className="settings-subsection">
                  <h4>Cards</h4>
                  <SettingsToggle
                    id="always-show-titles-toggle"
                    checked={settings.alwaysShowGameTitles}
                    onChange={(event) => updateSetting('alwaysShowGameTitles', event.target.checked)}
                  >
                    Always show game titles without hovering
                  </SettingsToggle>
                  <SettingsToggle
                    id="show-play-badge-toggle"
                    checked={settings.showPlayBadge}
                    onChange={(event) => updateSetting('showPlayBadge', event.target.checked)}
                    hint="Shows a play icon when hovering a game."
                  >
                    Play badge on hover
                  </SettingsToggle>
                  <SettingsChipRow
                    label="Hover effect"
                    options={[
                      { value: 'lift', label: 'Lift' },
                      { value: 'zoom', label: 'Zoom' },
                      { value: 'glow', label: 'Glow' },
                      { value: 'none', label: 'None' },
                    ]}
                    value={settings.cardHoverEffect}
                    onChange={(value) => updateSetting('cardHoverEffect', value)}
                  />
                  <SettingsChipRow
                    label="Favorite icon"
                    options={[
                      { value: 'star', label: '★ Star' },
                      { value: 'heart', label: '♥ Heart' },
                    ]}
                    value={settings.favoriteIconStyle}
                    onChange={(value) => updateSetting('favoriteIconStyle', value)}
                  />
                </div>
                <div className="settings-subsection">
                  <h4>Shape &amp; layout</h4>
                  <SettingsChipRow
                    label="Game icon shape"
                    options={[
                      { value: 'default', label: 'Default' },
                      { value: 'rounded-rect', label: 'Rounded Rect' },
                      { value: 'circle', label: 'Circle' },
                      { value: 'diamond', label: 'Diamond' },
                      { value: 'hex', label: 'Hex' },
                    ]}
                    value={settings.gameIconShape}
                    onChange={(value) => updateSetting('gameIconShape', value)}
                  />
                  <SettingsChipRow
                    label="Spacing"
                    options={[
                      { value: 'default', label: 'Default' },
                      { value: 'compact', label: 'Compact' },
                      { value: 'cozy', label: 'Cozy' },
                    ]}
                    value={settings.gameIconDensity}
                    onChange={(value) => updateSetting('gameIconDensity', value)}
                  />
                  <SettingsChipRow
                    label="Tile proportions"
                    options={[
                      { value: 'standard', label: 'Standard' },
                      { value: 'wide', label: 'Wide' },
                      { value: 'tall', label: 'Tall' },
                    ]}
                    value={settings.gameCardAspect}
                    onChange={(value) => updateSetting('gameCardAspect', value)}
                  />
                </div>
              </section>
              )}

              {activeSettingsSection === 'audio' && (
                <section className="settings-block">
                <h3>Audio</h3>
                <div className="settings-subsection">
                  <h4>Click sound</h4>
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
                </div>
                <div className="settings-subsection">
                  <h4>Background audio</h4>
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
                </div>
              </section>
              )}

              {activeSettingsSection === 'stealth' && (
                <section className="settings-block">
                <h3>Stealth tools</h3>
                <SettingsToggle
                  id="cloak-startup-toggle"
                  checked={cloakOnStartup}
                  onChange={(event) => {
                    setLastSettingsChangeAt(Date.now());
                    setCloakOnStartup(event.target.checked);
                  }}
                  hint="Opens the site inside an about:blank tab automatically."
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
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleUnlockCode();
                    }}
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
