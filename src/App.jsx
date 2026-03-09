import { useEffect, useState } from 'react';
import Aurora from './Aurora';
import BlurText from './BlurText';
import DecryptedText from './DecryptedText';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleAnimationComplete = () => {
    console.log('Animation completed!');
  };

  return (
    <main>
      {showIntro ? (
        <section className="intro-screen">
          <Aurora
            colorStops={['#8a3cd7', '#3c00ff', '#00fbff']}
            blend={0.5}
            amplitude={1.0}
            speed={1}
          />

          <div className="intro-content">
            <BlurText
              text="Deblocked"
              delay={220}
              animateBy="letters"
              direction="top"
              onAnimationComplete={handleAnimationComplete}
              className="text-2xl mb-8"
            />

            <div className="decrypted-list">
              <DecryptedText text="For Games" />

              <DecryptedText
                text="For games"
                speed={70}
                maxIterations={10}
                characters="ABCD1234!?"
                className="revealed"
                parentClassName="all-letters"
                encryptedClassName="encrypted"
              />

              <DecryptedText text="For Games" animateOn="view" clickMode="once" />

              <div style={{ marginTop: '4rem' }}>
                <DecryptedText
                  text="For Games"
                  animateOn="view"
                  revealDirection="start"
                  sequential
                  useOriginalCharsOnly={false}
                />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="main-content">
          <h1>Welcome to DeblockedX</h1>
          <p>Your intro has completed. Let&apos;s play.</p>
        </section>
      )}
    </main>
  );
}
