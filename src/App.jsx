import { useEffect, useState } from 'react';
import BlurText from './BlurText';
import FloatingLines from './FloatingLines';
import Particles from './Particles';
import GradualBlur from './GradualBlur';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 3200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main>
      {showIntro ? (
        <section className="intro-screen">
          <div className="intro-overlay" />
          <FloatingLines
            enabledWaves={['top', 'middle', 'bottom']}
            lineCount={[6, 8, 6]}
            lineDistance={[10, 14, 10]}
            bendRadius={7}
            bendStrength={-0.85}
            interactive
            parallax
          />

          <div className="intro-content">
            <span className="eyebrow">React Bits-inspired intro</span>
            <BlurText
              text="DeblockedX"
              delay={160}
              animateBy="letters"
              direction="top"
              className="hero-title"
            />
            <p className="hero-subtitle">
              Motion-based text, layered lines, and glassmorphism effects now use the original-style
              animation patterns instead of simplified placeholders.
            </p>
          </div>
        </section>
      ) : (
        <section className="main-content">
          <div className="background-gradient" />
          <Particles
            className="particles-bg"
            particleColors={['#9ad1ff', '#ffffff', '#6ee7ff']}
            particleCount={700}
            particleSpread={11}
            speed={0.12}
            particleBaseSize={110}
            sizeRandomness={1}
            moveParticlesOnHover
            particleHoverFactor={0.9}
            alphaParticles
            disableRotation={false}
            pixelRatio={Math.min(window.devicePixelRatio || 1, 1.5)}
          />

          <section className="content-shell">
            <div className="content-scroll">
              <span className="eyebrow">Updated visual system</span>
              <h1>Closer to the real React Bits rendering.</h1>
              <p>
                The text reveal now runs through <code>motion/react</code>, particles use the full OGL
                shader setup, and the edge blur uses the original layered mask/backdrop technique.
              </p>
              <p>
                If you add more React Bits components, this project now has the key runtime
                dependencies and rendering patterns those effects expect.
              </p>
              <div className="feature-grid">
                <article>
                  <h2>BlurText</h2>
                  <p>Intersection-triggered keyframes with staggered segment animation.</p>
                </article>
                <article>
                  <h2>Particles</h2>
                  <p>Depth-aware point cloud shader with hover parallax and alpha sprites.</p>
                </article>
                <article>
                  <h2>GradualBlur</h2>
                  <p>Multi-layer masked backdrop blur that fades naturally at the panel edge.</p>
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
      )}
    </main>
  );
}
