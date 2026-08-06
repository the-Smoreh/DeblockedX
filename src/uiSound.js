/*
 * Small synthesized UI sounds. Generated with WebAudio rather than shipped as
 * files so there are no extra requests and nothing to 404 later.
 *
 * The context is created lazily on the first real gesture: browsers block
 * audio until the user interacts, and constructing it earlier just leaves a
 * suspended context sitting around.
 */

let ctx = null;
let muted = false;
let lastHoverAt = 0;

const getCtx = () => {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

export const setMuted = (value) => { muted = Boolean(value); };

/* freq sweeps from -> to over `dur`, shaped by a short exponential decay so it
 * reads as a tick rather than a beep. */
function blip({ from, to, dur = 0.08, gain = 0.05, type = 'sine' }) {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + dur);

  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(amp).connect(ac.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

export const sfx = {
  hover() {
    // Hover fires constantly across a grid of cards, so rate limit hard.
    const now = Date.now();
    if (now - lastHoverAt < 55) return;
    lastHoverAt = now;
    blip({ from: 1750, to: 1500, dur: 0.045, gain: 0.016, type: 'sine' });
  },
  select() {
    blip({ from: 620, to: 1180, dur: 0.1, gain: 0.05, type: 'triangle' });
  },
  back() {
    blip({ from: 900, to: 420, dur: 0.11, gain: 0.045, type: 'triangle' });
  },
  toggle() {
    blip({ from: 1200, to: 1600, dur: 0.06, gain: 0.035, type: 'square' });
  },
  slide() {
    blip({ from: 320, to: 210, dur: 0.13, gain: 0.03, type: 'sine' });
  },
};
