import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './Masonry.css';

const CULLING_OVERSCAN_PX = 900;
const MASONRY_BREAKPOINTS = ['(min-width: 1680px)', '(min-width: 1320px)', '(min-width: 960px)', '(min-width: 640px)', '(min-width: 420px)'];
const MASONRY_COLUMNS = [9, 7, 5, 4, 3];
const DEFAULT_COLUMNS = 2;
const GUTTER_PX = 6;
const DESIGN_COLUMN_WIDTH = 280;
const MIN_CARD_HEIGHT = 96;

const useMedia = (queries, values, defaultValue) => {
  const getValue = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return defaultValue;
    }

    const matchedIndex = queries.findIndex((query) => window.matchMedia(query).matches);
    return values[matchedIndex] ?? defaultValue;
  };

  const [value, setValue] = useState(getValue);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQueries = queries.map((query) => window.matchMedia(query));
    const handler = () => setValue(getValue());

    handler();
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

    const updateSize = () => {
      if (!ref.current) return;
      const { width, height } = ref.current.getBoundingClientRect();
      setSize({ width, height });
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
};

const Masonry = ({
  items,
  onItemClick,
  onToggleFavorite,
  stagger = 0.05,
  hoverScale = 0.95,
  alwaysShowTitles = false,
  iconShape = 'default',
  iconDensity = 'default',
}) => {
  const columns = useMedia(MASONRY_BREAKPOINTS, MASONRY_COLUMNS, DEFAULT_COLUMNS);
  const [containerRef, { width }] = useMeasure();
  const [visibleIds, setVisibleIds] = useState(() => new Set());
  const [seenIds, setSeenIds] = useState(() => new Set());
  const seenIdsRef = useRef(new Set());

  useEffect(() => {
    seenIdsRef.current = seenIds;
  }, [seenIds]);

  useEffect(() => {
    setVisibleIds(new Set());
    setSeenIds(new Set());
    seenIdsRef.current = new Set();
  }, [items]);

  const grid = useMemo(() => {
    if (!width) return [];

    const colHeights = new Array(columns).fill(0);
    const columnWidth = width / columns;
    const heightScale = columnWidth / DESIGN_COLUMN_WIDTH;

    return items.map((item) => {
      const column = colHeights.indexOf(Math.min(...colHeights));
      const x = columnWidth * column;
      const h = Math.max(MIN_CARD_HEIGHT, (item.height / 2) * heightScale);
      const y = colHeights[column];
      colHeights[column] += h + GUTTER_PX;
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
          const shouldAnimateIn = isVisible && !hasBeenSeen;

          return (
            <div
              key={item.id}
              data-key={item.id}
              className={[
                'item-wrapper',
                `item-wrapper--density-${iconDensity}`,
                'item-wrapper--hydrated',
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
            >
              <button
                type="button"
                className="item-hitarea"
                onClick={() => onItemClick?.(item)}
                aria-label={`Open ${item.title}`}
              >
                {shouldRenderCard ? (
                  <div className={`item-img item-img--${iconShape}`} style={{ backgroundImage: `url(${item.img})` }}>
                    <div className={`item-copy${alwaysShowTitles ? ' item-copy--always-visible' : ''}`}>
                      <span>{item.title}</span>
                      {item.description ? <small>{item.description}</small> : null}
                    </div>
                  </div>
                ) : (
                  <div className={`item-img item-img--placeholder item-img--${iconShape}`} aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                className={`favorite-toggle${item.isFavorite ? ' favorite-toggle--active' : ''}`}
                aria-label={item.isFavorite ? `Unfavorite ${item.title}` : `Favorite ${item.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleFavorite?.(item.id);
                }}
              >
                <span aria-hidden="true">☆</span>
              </button>
            </div>
          );
        })()
      ))}
    </div>
  );
};

export default Masonry;
