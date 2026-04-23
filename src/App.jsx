import { useEffect, useMemo, useRef, useState } from 'react';
import CardNav from './CardNav';
import ClickSpark from './ClickSpark';
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
const BACKGROUND_AUDIO_KEY = 'deblockedx-background-audio-v1';
const ACCOUNTS_KEY = 'deblockedx-accounts-v1';
const ACTIVE_ACCOUNT_KEY = 'deblockedx-active-account-v1';
const PARTIES_KEY = 'deblockedx-parties-v1';
const GLOBAL_CHAT_KEY = 'deblockedx-global-chat-v1';
const PLAYER_STATUS_KEY = 'deblockedx-player-status-v1';
const MULTIPLAYER_THING_KEY = 'deblockedx-parties-global-v3';

const DEFAULT_SETTINGS = {
  introDurationSec: 3.2,
  enableIntro: true,
  enableAnimations: true,
  enableClickSound: false,
  enableIntroSound: false,
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

const readArrayStorage = (key) => {
  const parsed = readJsonStorage(key, []);
  return Array.isArray(parsed) ? parsed : [];
};

const readObjectStorage = (key) => {
  const parsed = readJsonStorage(key, {});
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
};

const LOCAL_MULTIPLAYER_SOURCE = typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : Math.random().toString(36).slice(2);

const readRemoteMultiplayerSnapshot = async () => {
  const response = await fetch(`https://dweet.io/get/latest/dweet/for/${MULTIPLAYER_THING_KEY}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not fetch multiplayer snapshot.');
  const payload = await response.json();
  const latest = payload?.with?.[0]?.content;
  if (!latest || typeof latest !== 'object') return null;
  return latest;
};

const writeRemoteMultiplayerSnapshot = async (snapshot) => {
  await fetch(`https://dweet.io/dweet/for/${MULTIPLAYER_THING_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(snapshot),
  });
};

const mergeAccounts = (localAccounts, remoteAccounts) => {
  const merged = new Map();
  [...(Array.isArray(localAccounts) ? localAccounts : []), ...(Array.isArray(remoteAccounts) ? remoteAccounts : [])]
    .forEach((account) => {
      if (!account || typeof account.username !== 'string') return;
      const key = account.username.toLowerCase();
      if (!merged.has(key)) {
        merged.set(key, {
          username: account.username,
          password: account.password || '',
          avatar: account.avatar || makeRandomAvatar(account.username),
        });
      }
    });
  return Array.from(merged.values());
};

const mergeMessages = (currentMessages, incomingMessages) => {
  const mapped = new Map();
  [...(Array.isArray(currentMessages) ? currentMessages : []), ...(Array.isArray(incomingMessages) ? incomingMessages : [])]
    .forEach((message) => {
      if (!message?.id) return;
      mapped.set(message.id, message);
    });
  return Array.from(mapped.values())
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
    .slice(-300);
};

const mergeParties = (localParties, remoteParties) => {
  const merged = new Map();
  [...(Array.isArray(localParties) ? localParties : []), ...(Array.isArray(remoteParties) ? remoteParties : [])]
    .forEach((party) => {
      if (!party?.id) return;
      const existing = merged.get(party.id);
      if (!existing) {
        merged.set(party.id, {
          ...party,
          members: Array.from(new Set(Array.isArray(party.members) ? party.members : [])),
          messages: Array.isArray(party.messages) ? party.messages : [],
        });
        return;
      }
      merged.set(party.id, {
        ...existing,
        ...party,
        members: Array.from(new Set([...(existing.members || []), ...((Array.isArray(party.members) ? party.members : []))])),
        messages: mergeMessages(existing.messages, party.messages),
      });
    });
  return Array.from(merged.values())
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
};

const makeRandomAvatar = (seed = Math.random().toString(36).slice(2)) => {
  const palette = ['#5eead4', '#7dd3fc', '#a5b4fc', '#f9a8d4', '#fde68a', '#86efac'];
  const colorA = palette[Math.floor(Math.random() * palette.length)];
  const colorB = palette[Math.floor(Math.random() * palette.length)];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${colorA}" />
          <stop offset="100%" stop-color="${colorB}" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#g)" rx="50" />
      <text x="50" y="58" fill="#04101f" font-size="38" text-anchor="middle" font-family="Inter, Arial" font-weight="700">${seed.slice(0, 1).toUpperCase()}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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
    <section className="second-library" aria-label="Second Library of Games">
      <div className="games-page__intro games-page__intro--compact">
        <p className="eyebrow">Second Library of Games</p>
        <h2>Second Library of Games</h2>
      </div>
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
          <span className="game-overlay__label">Game</span>
          <strong>{game.title}</strong>
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

function AuthModal({
  accounts,
  activeUser,
  onClose,
  onLogin,
  onCreateAccount,
  onLogout,
}) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [status, setStatus] = useState('');

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    if (typeof dataUrl === 'string') setAvatar(dataUrl);
  };

  return (
    <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Account">
      <div className="auth-modal__panel">
        <header className="auth-modal__header">
          <h2>{activeUser ? 'Account' : 'Log in / Create account'}</h2>
          <button type="button" onClick={onClose}>×</button>
        </header>
        {activeUser && (
          <div className="auth-active">
            <img src={activeUser.avatar} alt={`${activeUser.username} avatar`} />
            <div>
              <strong>{activeUser.username}</strong>
              <p>You are currently signed in.</p>
            </div>
            <button type="button" className="settings-chip settings-chip--cta" onClick={onLogout}>Log out</button>
          </div>
        )}
        {!activeUser && (
          <>
            <div className="settings-chip-row">
              <button type="button" className={`settings-chip${mode === 'login' ? ' settings-chip--active' : ''}`} onClick={() => setMode('login')}>Log in</button>
              <button type="button" className={`settings-chip${mode === 'create' ? ' settings-chip--active' : ''}`} onClick={() => setMode('create')}>Create</button>
            </div>
            <label className="settings-upload">
              <span>Username</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} type="text" />
            </label>
            <label className="settings-upload">
              <span>Password</span>
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
            </label>
            {mode === 'create' && (
              <label className="settings-upload">
                <span>Optional profile picture</span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} />
              </label>
            )}
            <button
              type="button"
              className="settings-chip settings-chip--active"
              onClick={() => {
                const cleanUser = username.trim();
                if (!cleanUser || !password.trim()) {
                  setStatus('Please fill username + password.');
                  return;
                }
                if (mode === 'create') {
                  const result = onCreateAccount(cleanUser, password, avatar);
                  setStatus(result);
                } else {
                  const result = onLogin(cleanUser, password);
                  setStatus(result);
                }
              }}
            >
              {mode === 'create' ? 'Create account' : 'Log in'}
            </button>
            {!!accounts.length && <p className="settings-copy">Existing users: {accounts.map((account) => account.username).join(', ')}</p>}
            {status && <p className="settings-copy">{status}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function PartyPanel({
  user,
  parties,
  activeGameTitle,
  globalChat,
  statuses,
  onClose,
  onCreateParty,
  onJoinParty,
  onSendPartyMessage,
  onSendGlobalMessage,
}) {
  const [x, setX] = useState(30);
  const [y, setY] = useState(100);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [minimized, setMinimized] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [privateParty, setPrivateParty] = useState(true);
  const [partyCode, setPartyCode] = useState('');
  const [selectedNames, setSelectedNames] = useState('');
  const [partyMessage, setPartyMessage] = useState('');
  const [globalMessage, setGlobalMessage] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [view, setView] = useState('parties');
  const serverTime = new Date().toUTCString();
  const selectedParty = parties.find((party) => party.id === selectedPartyId) ?? null;
  const myPartyCount = parties.filter((party) => party.members.includes(user.username)).length;

  useEffect(() => {
    const handleMove = (event) => {
      if (!dragging) return;
      setX(event.clientX - dragOffset.x);
      setY(event.clientY - dragOffset.y);
    };
    const handleUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragOffset.x, dragOffset.y, dragging]);

  return (
    <div className="party-panel" style={{ left: x, top: y }}>
      <div
        className="party-panel__bar"
        onMouseDown={(event) => {
          setDragging(true);
          setDragOffset({ x: event.clientX - x, y: event.clientY - y });
        }}
      >
        <strong>Parties · {user.username}</strong>
        <span className="party-panel__time">Server Time (UTC): {serverTime}</span>
        <div>
          <button type="button" onClick={() => setMinimized((current) => !current)}>{minimized ? 'Restore' : 'Minimize'}</button>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
      {!minimized && (
        <div className="party-panel__body">
          <div className="party-panel__stats">
            <article>
              <strong>{parties.length}</strong>
              <span>Active parties</span>
            </article>
            <article>
              <strong>{myPartyCount}</strong>
              <span>Your groups</span>
            </article>
            <article>
              <strong>{globalChat.length}</strong>
              <span>Global messages</span>
            </article>
          </div>
          <div className="settings-chip-row party-panel__nav">
            <button type="button" className={`settings-chip${view === 'parties' ? ' settings-chip--active' : ''}`} onClick={() => setView('parties')}>Parties</button>
            <button type="button" className={`settings-chip${view === 'global' ? ' settings-chip--active' : ''}`} onClick={() => setView('global')}>Global Chat</button>
          </div>

          {view === 'parties' && (
            <>
              <p className="settings-copy">Now playing: <strong>{activeGameTitle || 'Browsing menus'}</strong></p>
              <button type="button" className="settings-chip settings-chip--active" onClick={() => setIsCreateOpen((current) => !current)}>Create a party</button>
              {isCreateOpen && (
                <div className="party-create">
                  <label>Add usernames (comma separated)</label>
                  <input value={selectedNames} onChange={(event) => setSelectedNames(event.target.value)} placeholder="friend1, friend2" />
                  <SettingsToggle id="private-party-toggle" checked={privateParty} onChange={(event) => setPrivateParty(event.target.checked)}>Private party</SettingsToggle>
                  {privateParty && <input value={partyCode} onChange={(event) => setPartyCode(event.target.value)} placeholder="Party code" />}
                  <button
                    type="button"
                    className="settings-chip settings-chip--active"
                    onClick={() => {
                      const names = selectedNames.split(',').map((name) => name.trim()).filter(Boolean);
                      onCreateParty({ names, privateParty, partyCode });
                      setIsCreateOpen(false);
                      setSelectedNames('');
                      setPartyCode('');
                    }}
                  >
                    Confirm
                  </button>
                </div>
              )}

              <div className="party-list">
                {parties.map((party) => (
                  <article key={party.id} className={`party-item${selectedPartyId === party.id ? ' party-item--active' : ''}`}>
                    <button type="button" onClick={() => setSelectedPartyId(party.id)}>
                      {party.isPrivate ? '🔒 Private' : '🌍 Public'} · {party.members.length} players
                    </button>
                    <small className="settings-copy">Created {new Date(party.createdAt || Date.now()).toLocaleString()}</small>
                    <div className="party-avatars">
                      {party.members.map((name) => (
                        <span key={name} className="party-avatar-badge" title={name}>{name.slice(0, 1).toUpperCase()}</span>
                      ))}
                    </div>
                    {!party.members.includes(user.username) && (
                      <button type="button" onClick={() => onJoinParty(party.id, prompt('Enter party code if needed') || '')}>Join</button>
                    )}
                  </article>
                ))}
              </div>

              {selectedParty && (
                <div className="party-chat">
                  <h4>Party chat</h4>
                  <div className="party-chat__messages">
                    {(selectedParty.messages || []).map((message) => (
                      <p key={message.id}><strong>{message.author}:</strong> {message.text}</p>
                    ))}
                  </div>
                  <input value={partyMessage} onChange={(event) => setPartyMessage(event.target.value)} placeholder="Type party message..." />
                  <button type="button" onClick={() => { onSendPartyMessage(selectedParty.id, partyMessage); setPartyMessage(''); }}>Send</button>
                </div>
              )}
              <div className="party-status">
                <h4>Friends activity</h4>
                {Object.entries(statuses).map(([name, status]) => <p key={name}>{name}: {status}</p>)}
              </div>
            </>
          )}

          {view === 'global' && (
            <div className="party-chat">
              <h4>Global chat</h4>
              <div className="party-chat__messages">
                {globalChat.map((message) => <p key={message.id}><strong>{message.author}:</strong> {message.text}</p>)}
              </div>
              <input value={globalMessage} onChange={(event) => setGlobalMessage(event.target.value)} placeholder="Type global message..." />
              <button type="button" onClick={() => { onSendGlobalMessage(globalMessage); setGlobalMessage(''); }}>Send</button>
            </div>
          )}
        </div>
      )}
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
  const [introSoundDataUrl, setIntroSoundDataUrl] = useState(() => loadStorageValue(INTRO_SOUND_KEY, ''));
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
  const [showIntro, setShowIntro] = useState(true);
  const [introExiting, setIntroExiting] = useState(false);
  const [activePage, setActivePage] = useState('games');
  const [activeGame, setActiveGame] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [partyPanelOpen, setPartyPanelOpen] = useState(false);
  const [activeSettingsSection, setActiveSettingsSection] = useState('appearance');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSettingsChangeAt, setLastSettingsChangeAt] = useState(Date.now());
  const [cloakOnStartup, setCloakOnStartup] = useState(() => {
    const stored = loadStorageValue(CLOAK_PREF_KEY, '');
    return stored === '' ? true : stored === 'true';
  });
  const [accounts, setAccounts] = useState(() => readArrayStorage(ACCOUNTS_KEY));
  const [activeUsername, setActiveUsername] = useState(() => loadStorageValue(ACTIVE_ACCOUNT_KEY, ''));
  const [parties, setParties] = useState(() => readArrayStorage(PARTIES_KEY));
  const [globalChat, setGlobalChat] = useState(() => readArrayStorage(GLOBAL_CHAT_KEY));
  const [playerStatuses, setPlayerStatuses] = useState(() => readObjectStorage(PLAYER_STATUS_KEY));
  const [multiplayerReady, setMultiplayerReady] = useState(false);
  const clickAudioRef = useRef(null);
  const introAudioRef = useRef(null);
  const backgroundAudioRef = useRef(null);
  const introDismissTimeoutRef = useRef(null);
  const isApplyingRemoteStateRef = useRef(false);
  const lastRemoteUpdateAtRef = useRef(0);
  const activeUser = accounts.find((account) => account.username === activeUsername) ?? null;

  const handlePlayIntro = () => {
    if (!showIntro) return;
    setIntroExiting(true);
    if (introDismissTimeoutRef.current) clearTimeout(introDismissTimeoutRef.current);
    introDismissTimeoutRef.current = setTimeout(() => {
      setShowIntro(false);
      setIntroExiting(false);
      introDismissTimeoutRef.current = null;
    }, INTRO_FADE_MS);
  };

  useEffect(() => {
    if (!settings.enableIntro || settings.performanceMode) {
      setShowIntro(false);
      setIntroExiting(false);
      return;
    }
    setShowIntro(true);
    setIntroExiting(false);
  }, [settings.enableIntro, settings.performanceMode]);

  useEffect(() => () => {
    if (introDismissTimeoutRef.current) clearTimeout(introDismissTimeoutRef.current);
  }, []);

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
    saveStorageValue(ACCOUNTS_KEY, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    saveStorageValue(ACTIVE_ACCOUNT_KEY, activeUsername);
  }, [activeUsername]);

  useEffect(() => {
    saveStorageValue(PARTIES_KEY, JSON.stringify(parties));
  }, [parties]);

  useEffect(() => {
    saveStorageValue(GLOBAL_CHAT_KEY, JSON.stringify(globalChat));
  }, [globalChat]);

  useEffect(() => {
    saveStorageValue(PLAYER_STATUS_KEY, JSON.stringify(playerStatuses));
  }, [playerStatuses]);

  useEffect(() => {
    const handleStorageSync = () => {
      setAccounts(readArrayStorage(ACCOUNTS_KEY));
      setParties(readArrayStorage(PARTIES_KEY));
      setGlobalChat(readArrayStorage(GLOBAL_CHAT_KEY));
      setPlayerStatuses(readObjectStorage(PLAYER_STATUS_KEY));
      setActiveUsername(loadStorageValue(ACTIVE_ACCOUNT_KEY, ''));
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const pullSnapshot = async () => {
      try {
        const remoteSnapshot = await readRemoteMultiplayerSnapshot();
        if (!remoteSnapshot || cancelled) return;
        const updatedAt = Number(remoteSnapshot.updatedAt || 0);
        if (updatedAt <= lastRemoteUpdateAtRef.current) return;
        lastRemoteUpdateAtRef.current = updatedAt;
        isApplyingRemoteStateRef.current = true;
        setAccounts((current) => mergeAccounts(current, remoteSnapshot.accounts));
        setParties((current) => mergeParties(current, remoteSnapshot.parties));
        setGlobalChat((current) => mergeMessages(current, remoteSnapshot.globalChat));
        setPlayerStatuses((current) => ({
          ...current,
          ...(remoteSnapshot.playerStatuses && typeof remoteSnapshot.playerStatuses === 'object' ? remoteSnapshot.playerStatuses : {}),
        }));
      } catch {
        // Network failures should not break local multiplayer fallback.
      } finally {
        isApplyingRemoteStateRef.current = false;
        if (!cancelled) setMultiplayerReady(true);
      }
    };

    pullSnapshot();
    const intervalId = window.setInterval(pullSnapshot, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!multiplayerReady || isApplyingRemoteStateRef.current) return;

    const timeoutId = window.setTimeout(() => {
      const snapshot = {
        source: LOCAL_MULTIPLAYER_SOURCE,
        updatedAt: Date.now(),
        accounts,
        parties,
        globalChat,
        playerStatuses,
      };
      lastRemoteUpdateAtRef.current = snapshot.updatedAt;
      writeRemoteMultiplayerSnapshot(snapshot).catch(() => {
        // Local storage remains source of truth if remote sync fails.
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [accounts, globalChat, multiplayerReady, parties, playerStatuses]);

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

  useEffect(() => {
    if (!activeUser) return;
    const status = activeGame?.title ? `Playing ${activeGame.title}` : 'Browsing DeblockedX';
    setPlayerStatuses((current) => ({ ...current, [activeUser.username]: status }));
  }, [activeGame?.title, activeUser]);

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
    if (target === 'intro') setIntroSoundDataUrl(dataUrl);
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

  const handleCreateAccount = (username, password, avatar) => {
    const exists = accounts.some((account) => account.username.toLowerCase() === username.toLowerCase());
    if (exists) return 'Username already exists.';
    const createdAccount = {
      username,
      password,
      avatar: avatar || makeRandomAvatar(username),
    };
    setAccounts((current) => [...current, createdAccount]);
    setActiveUsername(username);
    return 'Account created and logged in.';
  };

  const handleLogin = (username, password) => {
    const matched = accounts.find((account) => account.username === username && account.password === password);
    if (!matched) return 'Invalid username/password.';
    setActiveUsername(username);
    return `Welcome back, ${username}.`;
  };

  const handleCreateParty = ({ names, privateParty, partyCode }) => {
    if (!activeUser) return;
    const validMembers = names.filter((name) => accounts.some((account) => account.username === name));
    const memberSet = new Set([activeUser.username, ...validMembers]);
    const created = {
      id: crypto.randomUUID(),
      isPrivate: privateParty,
      code: privateParty ? partyCode.trim() : '',
      members: Array.from(memberSet),
      createdAt: new Date().toISOString(),
      messages: [],
    };
    setParties((current) => [created, ...current]);
  };

  const handleJoinParty = (partyId, code) => {
    if (!activeUser) return;
    setParties((current) => current.map((party) => {
      if (party.id !== partyId) return party;
      if (party.isPrivate && party.code && party.code !== code) return party;
      if (party.members.includes(activeUser.username)) return party;
      return { ...party, members: [...party.members, activeUser.username] };
    }));
  };

  const handleSendPartyMessage = (partyId, text) => {
    if (!activeUser || !text.trim()) return;
    setParties((current) => current.map((party) => (
      party.id === partyId
        ? {
          ...party,
          messages: [...(party.messages || []), { id: crypto.randomUUID(), author: activeUser.username, text: text.trim(), createdAt: new Date().toISOString() }],
        }
        : party
    )));
  };

  const handleSendGlobalMessage = (text) => {
    if (!activeUser || !text.trim()) return;
    setGlobalChat((current) => [...current, { id: crypto.randomUUID(), author: activeUser.username, text: text.trim(), createdAt: new Date().toISOString() }].slice(-200));
  };


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
      {introSoundDataUrl && <audio ref={introAudioRef} src={introSoundDataUrl} preload="auto" />}
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
                  searchResultCount={totalGameAmount}
                  onOpenSettings={() => setSettingsOpen(true)}
                  onOpenAuth={() => setAuthOpen(true)}
                  onOpenParties={() => setPartyPanelOpen(true)}
                  user={activeUser}
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
                      iconDensity={settings.gameIconDensity}
                    />
                    <SecondLibraryGames />
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
                searchResultCount={totalGameAmount}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenAuth={() => setAuthOpen(true)}
                onOpenParties={() => setPartyPanelOpen(true)}
                user={activeUser}
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
                    iconDensity={settings.gameIconDensity}
                  />
                  <SecondLibraryGames />
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
          <div className={`intro-wave${isAnimationEnabled ? '' : ' intro-wave--still'}`} />
          <div className="intro-grid-fade" />

          <div className="intro-content">
            <h1 className="hero-title">DEBLOCKED</h1>
            <p className="intro-subtitle"> 1452 Games(7000 Soon), Proxies, Hacks.</p>
            <button type="button" className="intro-play-button" onClick={handlePlayIntro}>
              Play
            </button>
          </div>
        </section>
      )}

      {authOpen && (
        <AuthModal
          accounts={accounts}
          activeUser={activeUser}
          onClose={() => setAuthOpen(false)}
          onCreateAccount={handleCreateAccount}
          onLogin={handleLogin}
          onLogout={() => setActiveUsername('')}
        />
      )}

      {partyPanelOpen && activeUser && (
        <PartyPanel
          user={activeUser}
          parties={parties}
          activeGameTitle={activeGame?.title}
          globalChat={globalChat}
          statuses={playerStatuses}
          onClose={() => setPartyPanelOpen(false)}
          onCreateParty={handleCreateParty}
          onJoinParty={handleJoinParty}
          onSendPartyMessage={handleSendPartyMessage}
          onSendGlobalMessage={handleSendGlobalMessage}
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
                  ['intro', 'Intro'],
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

              {activeSettingsSection === 'intro' && (
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
