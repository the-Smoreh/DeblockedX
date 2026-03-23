import { useEffect, useRef } from 'react';
import { Mesh, Program, Renderer, Triangle } from 'ogl';
import './RippleGrid.css';

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255]
    : [1, 1, 1];
};

const RippleGrid = ({
  enableRainbow = false,
  gridColor = '#ffffff',
  rippleIntensity = 0.05,
  gridSize = 10,
  gridThickness = 15,
  fadeDistance = 1.5,
  vignetteStrength = 2,
  glowIntensity = 0.1,
  opacity = 1,
  gridRotation = 0,
  mouseInteraction = true,
  mouseInteractionRadius = 1,
}) => {
  const containerRef = useRef(null);
  const uniformsRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const mousePositionRef = { current: { x: 0.5, y: 0.5 } };
    const targetMouseRef = { current: { x: 0.5, y: 0.5 } };
    const mouseInfluenceRef = { current: 0 };

    const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 2), alpha: true });
    const { gl } = renderer;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';
    containerRef.current.appendChild(gl.canvas);

    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: [1, 1] },
      enableRainbow: { value: enableRainbow },
      gridColor: { value: hexToRgb(gridColor) },
      rippleIntensity: { value: rippleIntensity },
      gridSize: { value: gridSize },
      gridThickness: { value: gridThickness },
      fadeDistance: { value: fadeDistance },
      vignetteStrength: { value: vignetteStrength },
      glowIntensity: { value: glowIntensity },
      opacity: { value: opacity },
      gridRotation: { value: gridRotation },
      mouseInteraction: { value: mouseInteraction },
      mousePosition: { value: [0.5, 0.5] },
      mouseInfluence: { value: 0 },
      mouseInteractionRadius: { value: mouseInteractionRadius },
    };
    uniformsRef.current = uniforms;

    const program = new Program(gl, {
      vertex: `attribute vec2 position; varying vec2 vUv; void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }`,
      fragment: `precision highp float;
        uniform float iTime; uniform vec2 iResolution; uniform bool enableRainbow; uniform vec3 gridColor;
        uniform float rippleIntensity; uniform float gridSize; uniform float gridThickness; uniform float fadeDistance;
        uniform float vignetteStrength; uniform float glowIntensity; uniform float opacity; uniform float gridRotation;
        uniform bool mouseInteraction; uniform vec2 mousePosition; uniform float mouseInfluence; uniform float mouseInteractionRadius;
        varying vec2 vUv; float pi = 3.141592;
        mat2 rotate(float angle) { float s = sin(angle); float c = cos(angle); return mat2(c, -s, s, c); }
        void main() {
          vec2 uv = vUv * 2.0 - 1.0; uv.x *= iResolution.x / iResolution.y;
          if (gridRotation != 0.0) { uv = rotate(gridRotation * pi / 180.0) * uv; }
          float dist = length(uv); float func = sin(pi * (iTime - dist)); vec2 rippleUv = uv + uv * func * rippleIntensity;
          if (mouseInteraction && mouseInfluence > 0.0) {
            vec2 mouseUv = (mousePosition * 2.0 - 1.0); mouseUv.x *= iResolution.x / iResolution.y;
            float mouseDist = length(uv - mouseUv);
            float influence = mouseInfluence * exp(-mouseDist * mouseDist / (mouseInteractionRadius * mouseInteractionRadius));
            float mouseWave = sin(pi * (iTime * 2.0 - mouseDist * 3.0)) * influence;
            rippleUv += normalize(uv - mouseUv) * mouseWave * rippleIntensity * 0.3;
          }
          vec2 a = sin(gridSize * 0.5 * pi * rippleUv - pi / 2.0); vec2 b = abs(a);
          vec2 smoothB = vec2(smoothstep(0.0, 0.5, b.x), smoothstep(0.0, 0.5, b.y));
          vec3 color = vec3(0.0);
          color += exp(-gridThickness * smoothB.x * (0.8 + 0.5 * sin(pi * iTime)));
          color += exp(-gridThickness * smoothB.y);
          color += 0.5 * exp(-(gridThickness / 4.0) * sin(smoothB.x));
          color += 0.5 * exp(-(gridThickness / 3.0) * smoothB.y);
          if (glowIntensity > 0.0) {
            color += glowIntensity * exp(-gridThickness * 0.5 * smoothB.x);
            color += glowIntensity * exp(-gridThickness * 0.5 * smoothB.y);
          }
          float ddd = exp(-2.0 * clamp(pow(dist, fadeDistance), 0.0, 1.0));
          vec2 vignetteCoords = vUv - 0.5; float vignetteDistance = length(vignetteCoords);
          float vignette = clamp(1.0 - pow(vignetteDistance * 2.0, vignetteStrength), 0.0, 1.0);
          vec3 tint = enableRainbow ? vec3(uv.x * 0.5 + 0.5 * sin(iTime), uv.y * 0.5 + 0.5 * cos(iTime), pow(cos(iTime), 4.0)) + 0.5 : gridColor;
          float finalFade = ddd * vignette; float alpha = length(color) * finalFade * opacity;
          gl_FragColor = vec4(color * tint * finalFade * opacity, alpha);
        }`,
      uniforms,
    });

    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = containerRef.current;
      renderer.setSize(width, height);
      uniforms.iResolution.value = [width, height];
    };

    const handleMouseMove = (event) => {
      if (!mouseInteraction || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      targetMouseRef.current = {
        x: (event.clientX - rect.left) / rect.width,
        y: 1 - (event.clientY - rect.top) / rect.height,
      };
    };

    const handleMouseEnter = () => { mouseInfluenceRef.current = 1; };
    const handleMouseLeave = () => { mouseInfluenceRef.current = 0; };

    let frameId;
    const render = (time) => {
      uniforms.iTime.value = time * 0.001;
      mousePositionRef.current.x += (targetMouseRef.current.x - mousePositionRef.current.x) * 0.1;
      mousePositionRef.current.y += (targetMouseRef.current.y - mousePositionRef.current.y) * 0.1;
      uniforms.mouseInfluence.value += (mouseInfluenceRef.current - uniforms.mouseInfluence.value) * 0.05;
      uniforms.mousePosition.value = [mousePositionRef.current.x, mousePositionRef.current.y];
      renderer.render({ scene: mesh });
      frameId = requestAnimationFrame(render);
    };

    window.addEventListener('resize', resize);
    if (mouseInteraction) {
      containerRef.current.addEventListener('mousemove', handleMouseMove);
      containerRef.current.addEventListener('mouseenter', handleMouseEnter);
      containerRef.current.addEventListener('mouseleave', handleMouseLeave);
    }
    resize();
    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      if (mouseInteraction && containerRef.current) {
        containerRef.current.removeEventListener('mousemove', handleMouseMove);
        containerRef.current.removeEventListener('mouseenter', handleMouseEnter);
        containerRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
      renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
      containerRef.current?.removeChild(gl.canvas);
    };
  }, [enableRainbow, fadeDistance, glowIntensity, gridColor, gridRotation, gridSize, gridThickness, mouseInteraction, mouseInteractionRadius, opacity, rippleIntensity, vignetteStrength]);

  useEffect(() => {
    if (!uniformsRef.current) return;
    uniformsRef.current.enableRainbow.value = enableRainbow;
    uniformsRef.current.gridColor.value = hexToRgb(gridColor);
    uniformsRef.current.rippleIntensity.value = rippleIntensity;
    uniformsRef.current.gridSize.value = gridSize;
    uniformsRef.current.gridThickness.value = gridThickness;
    uniformsRef.current.fadeDistance.value = fadeDistance;
    uniformsRef.current.vignetteStrength.value = vignetteStrength;
    uniformsRef.current.glowIntensity.value = glowIntensity;
    uniformsRef.current.opacity.value = opacity;
    uniformsRef.current.gridRotation.value = gridRotation;
    uniformsRef.current.mouseInteraction.value = mouseInteraction;
    uniformsRef.current.mouseInteractionRadius.value = mouseInteractionRadius;
  }, [enableRainbow, fadeDistance, glowIntensity, gridColor, gridRotation, gridSize, gridThickness, mouseInteraction, mouseInteractionRadius, opacity, rippleIntensity, vignetteStrength]);

  return <div ref={containerRef} className="ripple-grid-container" />;
};

export default RippleGrid;
