import { useEffect, useRef } from 'react';

export default function Aurora({ colorStops, blend = 0.5, amplitude = 1, speed = 1 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let frame;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };

    const draw = () => {
      t += 0.01 * speed;
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const gradA = ctx.createLinearGradient(0, 0, width, height);
      gradA.addColorStop(0, colorStops[0]);
      gradA.addColorStop(1, colorStops[1]);

      const gradB = ctx.createLinearGradient(width, 0, 0, height);
      gradB.addColorStop(0, colorStops[1]);
      gradB.addColorStop(1, colorStops[2]);

      ctx.globalAlpha = 0.65;
      ctx.fillStyle = gradA;
      ctx.fillRect(0, 0, width, height);

      const wave = Math.sin(t) * 120 * amplitude;
      ctx.globalAlpha = blend;
      ctx.fillStyle = gradB;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.4 + wave * 0.3);
      ctx.bezierCurveTo(
        width * 0.25,
        height * 0.1 + wave,
        width * 0.7,
        height * 0.9 - wave,
        width,
        height * 0.6 - wave * 0.2
      );
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      frame = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [colorStops, blend, amplitude, speed]);

  return <canvas ref={canvasRef} className="aurora-canvas" aria-hidden="true" />;
}
