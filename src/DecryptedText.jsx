import { useEffect, useMemo, useRef, useState } from 'react';

function randomFrom(source) {
  return source[Math.floor(Math.random() * source.length)];
}

export default function DecryptedText({
  text,
  speed = 50,
  maxIterations = 12,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!?',
  className = '',
  parentClassName = '',
  encryptedClassName = '',
  animateOn = 'hover',
  clickMode = 'toggle',
  revealDirection = 'end',
  sequential = false,
  useOriginalCharsOnly = true
}) {
  const [display, setDisplay] = useState(text);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const ref = useRef(null);

  const fallbackSet = useMemo(() => {
    return useOriginalCharsOnly
      ? Array.from(new Set(text.replace(/\s+/g, '').split(''))).join('') || characters
      : characters;
  }, [text, characters, useOriginalCharsOnly]);

  useEffect(() => {
    if (!running) return;
    let iteration = 0;
    const timer = setInterval(() => {
      iteration += 1;
      const progress = Math.min(iteration / maxIterations, 1);
      const revealCount = Math.floor(progress * text.length);

      const next = text
        .split('')
        .map((char, index) => {
          if (char === ' ') return ' ';
          const shouldReveal = sequential
            ? revealDirection === 'start'
              ? index < revealCount
              : index >= text.length - revealCount
            : Math.random() < progress;
          return shouldReveal ? char : randomFrom(fallbackSet);
        })
        .join('');

      setDisplay(next);
      if (iteration >= maxIterations) {
        clearInterval(timer);
        setDisplay(text);
        setDone(true);
        setRunning(false);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [running, speed, text, maxIterations, fallbackSet, sequential, revealDirection]);

  useEffect(() => {
    if (animateOn !== 'view' || !ref.current || done) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRunning(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [animateOn, done]);

  const onClick = () => {
    if (animateOn !== 'click') return;
    if (clickMode === 'once' && done) return;
    setDone(false);
    setRunning(true);
  };

  const onMouseEnter = () => {
    if (animateOn !== 'hover') return;
    setDone(false);
    setRunning(true);
  };

  return (
    <span ref={ref} className={parentClassName} onClick={onClick} onMouseEnter={onMouseEnter}>
      <span className={`${className} ${running ? encryptedClassName : ''}`.trim()}>{display}</span>
    </span>
  );
}
