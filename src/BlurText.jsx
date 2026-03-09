import { useEffect, useState } from 'react';

export default function BlurText({
  text,
  delay = 220,
  animateBy = 'letters',
  direction = 'top',
  onAnimationComplete,
  className = ''
}) {
  const [visibleCount, setVisibleCount] = useState(0);
  const chunks = animateBy === 'words' ? text.split(' ') : text.split('');

  useEffect(() => {
    setVisibleCount(0);
    const timer = setInterval(() => {
      setVisibleCount((prev) => {
        const next = prev + 1;
        if (next >= chunks.length) {
          clearInterval(timer);
          onAnimationComplete?.();
        }
        return next;
      });
    }, delay);

    return () => clearInterval(timer);
  }, [text, delay, chunks.length, onAnimationComplete]);

  return (
    <div className={`blur-text ${className}`.trim()}>
      {chunks.map((char, index) => (
        <span
          key={`${char}-${index}`}
          className={index < visibleCount ? 'shown' : `hidden ${direction}`}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </div>
  );
}
