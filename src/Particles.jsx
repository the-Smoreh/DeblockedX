import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Geometry } from 'ogl';

export default function Particles({
  particleColors = ['#ffffff'],
  particleCount = 600,
  particleSpread = 10,
  speed = 0.7,
  particleBaseSize = 100,
  moveParticlesOnHover = true,
  alphaParticles = false,
  disableRotation = false,
  pixelRatio = 1
}) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new Renderer({ alpha: true, dpr: pixelRatio });
    const gl = renderer.gl;
    gl.clearColor(0.02, 0.04, 0.12, 1);
    mount.appendChild(gl.canvas);

    const vertex = `
      attribute vec3 position;
      uniform float uTime;
      uniform vec2 uMouse;
      uniform float uSize;
      uniform float uSpread;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.3 + p.y * 2.0) * 0.06;
        p.y += cos(uTime * 0.4 + p.x * 2.0) * 0.06;
        p.xy += uMouse * 0.08;
        vec4 mvPosition = vec4(p, 1.0);
        gl_Position = mvPosition;
        gl_PointSize = uSize / (1.0 + length(p.xy));
        vAlpha = 1.0 - length(p.xy) / (uSpread * 0.4);
      }
    `;

    const fragment = `
      precision highp float;
      uniform vec3 uColor;
      uniform float uAlpha;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        float circle = smoothstep(0.5, 0.1, d);
        gl_FragColor = vec4(uColor, circle * mix(1.0, vAlpha, uAlpha));
      }
    `;

    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 2 * (particleSpread / 10);
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2 * (particleSpread / 10);
      positions[i * 3 + 2] = 0;
    }

    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions }
    });

    const color = particleColors[0] || '#ffffff';
    const rgb = [1, 1, 1];
    if (color.startsWith('#') && color.length === 7) {
      rgb[0] = parseInt(color.slice(1, 3), 16) / 255;
      rgb[1] = parseInt(color.slice(3, 5), 16) / 255;
      rgb[2] = parseInt(color.slice(5, 7), 16) / 255;
    }

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: [0, 0] },
        uColor: { value: rgb },
        uSize: { value: particleBaseSize / 12 },
        uSpread: { value: particleSpread },
        uAlpha: { value: alphaParticles ? 1 : 0 }
      },
      transparent: true
    });

    const points = new Mesh(gl, { mode: gl.POINTS, geometry, program });

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      gl.viewport(0, 0, w, h);
    };

    const onMove = (event) => {
      if (!moveParticlesOnHover) return;
      const rect = mount.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      program.uniforms.uMouse.value = [x, y];
    };

    let raf;
    const update = (t) => {
      program.uniforms.uTime.value = t * 0.001 * speed;
      if (!disableRotation) {
        points.rotation.z = t * 0.00003;
      }
      renderer.render({ scene: points });
      raf = requestAnimationFrame(update);
    };

    resize();
    update(0);
    window.addEventListener('resize', resize);
    mount.addEventListener('pointermove', onMove);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      mount.removeEventListener('pointermove', onMove);
      if (gl.canvas.parentNode === mount) mount.removeChild(gl.canvas);
    };
  }, [
    particleColors,
    particleCount,
    particleSpread,
    speed,
    particleBaseSize,
    moveParticlesOnHover,
    alphaParticles,
    disableRotation,
    pixelRatio
  ]);

  return <div ref={mountRef} className="particles-bg" aria-hidden="true" />;
}
