import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './Masonry.css';

const useMedia = (queries, values, defaultValue) => {
  const getValue = () => values[queries.findIndex((query) => matchMedia(query).matches)] ?? defaultValue;
  const [value, setValue] = useState(getValue);

  useEffect(() => {
    const mediaQueries = queries.map((query) => matchMedia(query));
    const handler = () => setValue(getValue());
    mediaQueries.forEach((mediaQuery) => mediaQuery.addEventListener('change', handler));
    return () => mediaQueries.forEach((mediaQuery) => mediaQuery.removeEventListener('change', handler));
  }, [defaultValue, queries, values]);

  return value;
};

const useMeasure = () => {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
};

const preloadImages = async (urls) => Promise.all(urls.map((src) => new Promise((resolve) => {
  const img = new Image();
  img.src = src;
  img.onload = img.onerror = () => resolve();
})));

const Masonry = ({ items, stagger = 0.05, hoverScale = 0.95 }) => {
  const columns = useMedia(
    ['(min-width: 1500px)', '(min-width: 1000px)', '(min-width: 600px)', '(min-width: 400px)'],
    [5, 4, 3, 2],
    1,
  );
  const [containerRef, { width }] = useMeasure();
  const [imagesReady, setImagesReady] = useState(false);

  useEffect(() => {
    let active = true;
    preloadImages(items.map((item) => item.img)).then(() => {
      if (active) setImagesReady(true);
    });
    return () => { active = false; };
  }, [items]);

  const grid = useMemo(() => {
    if (!width) return [];
    const colHeights = new Array(columns).fill(0);
    const columnWidth = width / columns;

    return items.map((item) => {
      const column = colHeights.indexOf(Math.min(...colHeights));
      const x = columnWidth * column;
      const h = item.height / 2;
      const y = colHeights[column];
      colHeights[column] += h;
      return { ...item, x, y, w: columnWidth, h };
    });
  }, [columns, items, width]);

  const totalHeight = Math.max(...grid.map((item) => item.y + item.h), 0);

  return (
    <div ref={containerRef} className="list" style={{ height: totalHeight }}>
      {grid.map((item, index) => (
        <div
          key={item.id}
          data-key={item.id}
          className={`item-wrapper ${imagesReady ? 'item-wrapper--ready' : ''}`}
          style={{
            width: item.w,
            height: item.h,
            transform: `translate(${item.x}px, ${item.y}px)`,
            transitionDelay: `${index * stagger}s`,
            '--hover-scale': hoverScale,
          }}
          onClick={() => window.open(item.url, '_blank', 'noopener')}
        >
          <div className="item-img" style={{ backgroundImage: `url(${item.img})` }}>
            <div className="item-copy">
              <span>{item.title}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Masonry;
