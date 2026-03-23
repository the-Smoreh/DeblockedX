import { useEffect, useState } from 'react';
import BlurText from './BlurText';
import FloatingLines from './FloatingLines';
import GradualBlur from './GradualBlur';
import MagicRings from './MagicRings';

const INTRO_DURATION_MS = 3200;
const INTRO_FADE_MS = 700;

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

        <section className="content-shell">
          <div className="content-scroll">
            <h1>Deblocked</h1>
            <p>
              Main content is now shown over the animated ring background, while the intro keeps only
              the Deblocked reveal before fading away.
            </p>
            <div className="feature-grid">
              <article>
                <h2>Intro</h2>
                <p>Floating lines background with only the Deblocked text reveal.</p>
              </article>
              <article>
                <h2>Transition</h2>
                <p>The intro now fades out smoothly before the main content fully takes focus.</p>
              </article>
              <article>
                <h2>Main view</h2>
                <p>Magic rings replace the old particle background for the content page.</p>
              </article>
            </div>
            <div className="spacer" />
          </div>

          <GradualBlur
            target="parent"
            position="bottom"
            height="8rem"
            strength={2.5}
            divCount={8}
            curve="bezier"
            exponential
            opacity={1}
          />
        </section>
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
            <BlurText
              text="Deblocked"
              delay={160}
              animateBy="letters"
              direction="top"
              className="hero-title"
            />
          </div>
        </section>
      )}
    </main>
  );
}
