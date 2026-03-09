import { useMemo } from 'react';
import { create, all } from 'mathjs';

const math = create(all, {});

export default function GradualBlur({
  position = 'bottom',
  height = '7rem',
  strength = 2,
  divCount = 5,
  curve = 'bezier',
  exponential = true,
  opacity = 1
}) {
  const layers = useMemo(() => {
    return Array.from({ length: divCount }).map((_, i) => {
      const t = (i + 1) / divCount;
      const intensity =
        curve === 'bezier'
          ? Number(math.evaluate(`${t}^2 * (3 - 2*${t})`))
          : exponential
            ? Number(math.evaluate(`(${t})^1.8`))
            : t;

      return {
        blur: intensity * strength * 6,
        alpha: intensity * opacity
      };
    });
  }, [divCount, strength, curve, exponential, opacity]);

  return (
    <div className={`gradual-blur gradual-blur-${position}`} style={{ height }} aria-hidden="true">
      {layers.map((layer, idx) => (
        <div
          key={idx}
          className="gradual-blur-layer"
          style={{
            backdropFilter: `blur(${layer.blur}px)`,
            WebkitBackdropFilter: `blur(${layer.blur}px)`,
            background: `rgba(3, 7, 15, ${Math.min(layer.alpha, 0.45)})`
          }}
        />
      ))}
    </div>
  );
}
