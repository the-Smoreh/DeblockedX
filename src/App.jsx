import { useEffect, useMemo, useState } from 'react';
import BlurText from './BlurText';
import CardNav from './CardNav';
import ClickSpark from './ClickSpark';
import FloatingLines from './FloatingLines';
import MagicRings from './MagicRings';
import Masonry from './Masonry';
import RippleGrid from './RippleGrid';

const INTRO_DURATION_MS = 3200;
const INTRO_FADE_MS = 700;

const navItems = [
  {
    label: 'Games',
    bgColor: '#0D0716',
    textColor: '#fff',
    links: [{ label: '800+', ariaLabel: '800 plus games' }],
  },
  {
    label: 'Hacks',
    bgColor: '#170D27',
    textColor: '#fff',
    links: [
      { label: 'Bookmarklets', ariaLabel: 'Bookmarklets' },
      { label: 'Console Hacks', ariaLabel: 'Console Hacks' },
    ],
  },
  {
    label: 'Proxies',
    bgColor: '#271E37',
    textColor: '#fff',
    links: [{ label: 'See everything', ariaLabel: 'See every proxy' }],
  },
];

const gameItems = [
  { id: '1', title: 'Retro Run', img: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80', url: 'https://example.com/retro-run', height: 520 },
  { id: '2', title: 'Sky Drift', img: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80', url: 'https://example.com/sky-drift', height: 360 },
  { id: '3', title: 'Pixel Siege', img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80', url: 'https://example.com/pixel-siege', height: 620 },
  { id: '4', title: 'Turbo Loop', img: 'https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=900&q=80', url: 'https://example.com/turbo-loop', height: 420 },
  { id: '5', title: 'Night Shift', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80', url: 'https://example.com/night-shift', height: 540 },
  { id: '6', title: 'Orbital Dash', img: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=900&q=80', url: 'https://example.com/orbital-dash', height: 390 },
];

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [introExiting, setIntroExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setIntroExiting(true), INTRO_DURATION_MS - INTRO_FADE_MS);
    const hideTimer = setTimeout(() => setShowIntro(false), INTRO_DURATION_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const masonryItems = useMemo(() => gameItems, []);

  return (
    <main>
      <section className="main-content">
        <div className="main-background">
          <MagicRings
            color="#fc42ff"
            colorTwo="#42fcff"
            ringCount={4}
            speed={1.5}
            attenuation={10}
            lineThickness={2}
            baseRadius={0.35}
            radiusStep={0.1}
            scaleRate={0.1}
            opacity={1}
            blur={0}
            noiseAmount={0.1}
            rotation={0}
            ringGap={1.5}
            fadeIn={0.7}
            fadeOut={0.5}
            followMouse={false}
            mouseInfluence={0.2}
            hoverScale={1.2}
            parallax={0.05}
            clickBurst={false}
          />
        </div>

        <ClickSpark sparkColor="#fff" sparkSize={7} sparkRadius={30} sparkCount={8} duration={400}>
          <section className="page-shell">
            <CardNav
              title="deblocked"
              items={navItems}
              baseColor="rgba(255, 255, 255, 0.92)"
              menuColor="#000"
              buttonBgColor="#111"
              buttonTextColor="#fff"
              ease="power3.out"
            />

            <section className="games-page">
              <div className="games-page__intro">
                <p className="eyebrow">Game Page</p>
                <h1>Deblocked game room.</h1>
              </div>
              <Masonry
                items={masonryItems}
                ease="elastic.out(1, 0.75)"
                duration={0.1}
                stagger={0.09}
                animateFrom="bottom"
                scaleOnHover
                hoverScale={0.95}
                blurToFocus
                colorShiftOnHover={false}
              />
            </section>

            <section className="hacks-preview">
              <div className="hacks-preview__background">
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
              </div>
              <div className="hacks-preview__content">
                <p className="eyebrow">Hacks</p>
                <h2>Ripple background staged for the hacks page.</h2>
                <p>Bookmarklets and console hacks will plug into this section next.</p>
              </div>
            </section>
          </section>
        </ClickSpark>
      </section>

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
