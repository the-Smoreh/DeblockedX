import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function normalizeWaveList(enabledWaves) {
  const all = ['top', 'middle', 'bottom'];
  return Array.isArray(enabledWaves) && enabledWaves.length ? enabledWaves : all;
}

function waveOffset(name, height) {
  if (name === 'top') return -height * 0.22;
  if (name === 'bottom') return height * 0.22;
  return 0;
}

export default function FloatingLines({
  enabledWaves = ['top', 'middle', 'bottom'],
  lineCount = 5,
  lineDistance = 5,
  bendRadius = 5,
  bendStrength = -0.5,
  interactive = true,
  parallax = true
}) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    let width = mount.clientWidth;
    let height = mount.clientHeight;
    const waves = normalizeWaveList(enabledWaves);
    const lineGroups = [];
    const pointer = new THREE.Vector2(0, 0);

    const lineCountArray = Array.isArray(lineCount) ? lineCount : waves.map(() => lineCount);
    const lineDistanceArray = Array.isArray(lineDistance)
      ? lineDistance
      : waves.map(() => lineDistance);

    const setSize = () => {
      width = mount.clientWidth;
      height = mount.clientHeight;
      renderer.setSize(width, height);
    };

    const buildLine = (yOffset, index, total, distanceUnit) => {
      const points = [];
      const pointCount = 120;
      for (let i = 0; i <= pointCount; i += 1) {
        const x = (i / pointCount) * 2 - 1;
        const y = yOffset + (index - (total - 1) / 2) * (distanceUnit / 100);
        points.push(new THREE.Vector3(x, y, 0));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color('#8ed0ff'),
        transparent: true,
        opacity: 0.42
      });
      return new THREE.Line(geometry, material);
    };

    waves.forEach((waveName, waveIndex) => {
      const group = new THREE.Group();
      const count = lineCountArray[waveIndex] ?? 5;
      const distance = lineDistanceArray[waveIndex] ?? 5;
      const offset = waveOffset(waveName, height);

      for (let i = 0; i < count; i += 1) {
        const line = buildLine(offset / height, i, count, distance);
        group.add(line);
      }

      lineGroups.push(group);
      scene.add(group);
    });

    const onPointerMove = (event) => {
      if (!interactive) return;
      const rect = mount.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    };

    let frame = 0;
    const animate = () => {
      frame += 0.012;
      lineGroups.forEach((group, groupIndex) => {
        group.children.forEach((line, lineIndex) => {
          const pos = line.geometry.attributes.position;
          for (let i = 0; i < pos.count; i += 1) {
            const x = pos.getX(i);
            const base = waveOffset(waves[groupIndex], height) / height;
            const dist = (lineIndex - (group.children.length - 1) / 2) * ((lineDistanceArray[groupIndex] ?? 5) / 100);
            const wave = Math.sin((x + frame) * bendRadius + groupIndex) * (bendStrength / 5);
            const follow = interactive ? pointer.y * 0.04 : 0;
            pos.setY(i, base + dist + wave + follow);
          }
          pos.needsUpdate = true;
        });

        if (parallax) {
          group.position.x = pointer.x * 0.03 * (groupIndex + 1);
          group.position.y = pointer.y * 0.02 * (groupIndex + 1);
        }
      });

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    setSize();
    animate();
    window.addEventListener('resize', setSize);
    mount.addEventListener('pointermove', onPointerMove);

    return () => {
      window.removeEventListener('resize', setSize);
      mount.removeEventListener('pointermove', onPointerMove);
      lineGroups.forEach((group) => {
        group.children.forEach((line) => {
          line.geometry.dispose();
          line.material.dispose();
        });
        scene.remove(group);
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [enabledWaves, lineCount, lineDistance, bendRadius, bendStrength, interactive, parallax]);

  return <div ref={mountRef} className="floating-lines" aria-hidden="true" />;
}
