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

const Masonry = ({ items, onItemClick, stagger = 0.05, hoverScale = 0.95 }) => {
  const columns = useMedia(
    ['(min-width: 1680px)', '(min-width: 1320px)', '(min-width: 960px)', '(min-width: 640px)', '(min-width: 420px)'],
    [6, 5, 4, 3, 2],
    1,
  );
  const [containerRef, { width }] = useMeasure();
  const [imagesReady, setImagesReady] = useState(false);

  useEffect(() => {
    let active = true;
    setImagesReady(false);
    preloadImages(items.map((item) => item.img)).then(() => {
      if (active) setImagesReady(true);
    });
    return () => { active = false; };
  }, [items]);

  const grid = useMemo(() => {
    if (!width) return [];

    const gutter = 8;
    const colHeights = new Array(columns).fill(0);
    const columnWidth = width / columns;

    return items.map((item) => {
      const column = colHeights.indexOf(Math.min(...colHeights));
      const x = columnWidth * column;
      const h = item.height / 2;
      const y = colHeights[column];
      colHeights[column] += h + gutter;
      return { ...item, x, y, w: columnWidth, h };
    });
  }, [columns, items, width]);

  const totalHeight = Math.max(...grid.map((item) => item.y + item.h), 0);

  return (
    <div ref={containerRef} className="list" style={{ height: totalHeight }}>
      {grid.map((item, index) => (
        <button
          key={item.id}
          type="button"
          data-key={item.id}
          className={`item-wrapper ${imagesReady ? 'item-wrapper--ready' : ''}`}
          style={{
            width: item.w,
            height: item.h,
            transform: `translate(${item.x}px, ${item.y}px)`,
            transitionDelay: `${index * stagger}s`,
            '--hover-scale': hoverScale,
          }}
          onClick={() => onItemClick?.(item)}
        >
          <div className="item-img" style={{ backgroundImage: `url(${item.img})` }}>
            <div className="item-copy">
              <span>{item.title}</span>
              {item.description ? <small>{item.description}</small> : null}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default Masonry;
