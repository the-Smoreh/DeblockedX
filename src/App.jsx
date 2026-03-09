import { useEffect, useState } from 'react';
import BlurText from './BlurText';
import FloatingLines from './FloatingLines';
import Particles from './Particles';
import GradualBlur from './GradualBlur';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main>
      {showIntro ? (
        <section className="intro-screen">
          <FloatingLines
            enabledWaves={['top', 'middle', 'bottom']}
            lineCount={5}
            lineDistance={5}
            bendRadius={5}
            bendStrength={-0.5}
            interactive
            parallax
          />

          <div className="intro-content">
            <BlurText
              text="Deblocked"
              delay={220}
              animateBy="letters"
              direction="top"
              className="text-2xl mb-8"
            />
          </div>
        </section>
      ) : (
        <section className="main-content">
          <Particles
            particleColors={['#ffffff']}
            particleCount={600}
            particleSpread={10}
            speed={0.7}
            particleBaseSize={100}
            moveParticlesOnHover
            alphaParticles={false}
            disableRotation={false}
            pixelRatio={1}
          />

          <section className="content-shell">
            <div className="content-scroll">
              <h1>Welcome to DeblockedX</h1>
              <p>You are now inside the main website.</p>
              <p>Explore your games and apps with a smoother, modern visual background.</p>
              <p>Scroll this area to see the gradual blur effect appear at the bottom edge.</p>
              <div className="spacer" />
            </div>

            <GradualBlur
              target="parent"
              position="bottom"
              height="7rem"
              strength={2}
              divCount={5}
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
