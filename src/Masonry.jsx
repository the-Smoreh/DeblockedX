import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './Masonry.css';

const CULLING_OVERSCAN_PX = 900;

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
  const [visibleIds, setVisibleIds] = useState(() => new Set());
  const [seenIds, setSeenIds] = useState(() => new Set());
  const seenIdsRef = useRef(new Set());

  useEffect(() => {
    seenIdsRef.current = seenIds;
  }, [seenIds]);

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

  useEffect(() => {
    if (!grid.length || !containerRef.current) return undefined;

    let frameId = 0;

    const updateVisibility = () => {
      frameId = 0;

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const viewportTop = -containerRect.top - CULLING_OVERSCAN_PX;
      const viewportBottom = viewportTop + window.innerHeight + CULLING_OVERSCAN_PX * 2;

      const nextVisibleIds = new Set();
      const newlySeenIds = [];

      grid.forEach((item) => {
        const itemTop = item.y;
        const itemBottom = item.y + item.h;
        const isVisible = itemBottom >= viewportTop && itemTop <= viewportBottom;

        if (isVisible) {
          nextVisibleIds.add(item.id);
          if (!seenIdsRef.current.has(item.id)) {
            newlySeenIds.push(item.id);
          }
        }
      });

      setVisibleIds((current) => {
        if (
          current.size === nextVisibleIds.size &&
          [...current].every((id) => nextVisibleIds.has(id))
        ) {
          return current;
        }
        return nextVisibleIds;
      });

      if (newlySeenIds.length > 0) {
        setSeenIds((current) => {
          const next = new Set(current);
          newlySeenIds.forEach((id) => next.add(id));
          return next;
        });
      }
    };

    const scheduleUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(updateVisibility);
    };

    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [grid]);

  return (
    <div ref={containerRef} className="list" style={{ height: totalHeight }}>
      {grid.map((item, index) => (
        (() => {
          const isVisible = visibleIds.has(item.id);
          const hasBeenSeen = seenIds.has(item.id);
          const shouldRenderCard = isVisible || hasBeenSeen;
          const shouldAnimateIn = imagesReady && isVisible && !hasBeenSeen;

          return (
            <button
              key={item.id}
              type="button"
              data-key={item.id}
              className={[
                'item-wrapper',
                imagesReady ? 'item-wrapper--hydrated' : '',
                shouldRenderCard ? 'item-wrapper--ready' : 'item-wrapper--culled',
                shouldAnimateIn ? 'item-wrapper--entering' : '',
              ].filter(Boolean).join(' ')}
              style={{
                width: item.w,
                height: item.h,
                transform: `translate(${item.x}px, ${item.y}px)`,
                transitionDelay: shouldAnimateIn ? `${index * stagger}s` : '0s',
                '--hover-scale': hoverScale,
              }}
              onClick={() => onItemClick?.(item)}
              aria-label={`Open ${item.title}`}
            >
              {shouldRenderCard ? (
                <div className="item-img" style={{ backgroundImage: `url(${item.img})` }}>
                  <div className="item-copy">
                    <span>{item.title}</span>
                    {item.description ? <small>{item.description}</small> : null}
                  </div>
                </div>
              ) : (
                <div className="item-img item-img--placeholder" aria-hidden="true" />
              )}
            </button>
          );
        })()
      ))}
    </div>
  );
};

export default Masonry;
