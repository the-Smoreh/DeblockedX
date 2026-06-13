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
    const { width, height } = ref.current.getBoundingClientRect();
    setSize({ width, height });
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
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
  hoverEffect = 'lift',
  favoriteIconStyle = 'star',
  showPlayBadge = true,
}) => {
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
    setVisibleIds(new Set());
    setSeenIds(new Set());
    seenIdsRef.current = new Set();
  }, [items]);

  // Mark ready on the next frame instead of eagerly decoding every image in the
  // library at once. Visible cards lazy-load their own background images, which
  // keeps memory/CPU flat no matter how large the library is.
  useEffect(() => {
    setImagesReady(false);
    const frame = window.requestAnimationFrame(() => setImagesReady(true));
    return () => window.cancelAnimationFrame(frame);
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

  // Layout effect so the first batch of visible cards is computed before paint
  // (avoids a blank frame now that off-screen cards aren't mounted).
  useLayoutEffect(() => {
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

    updateVisibility();
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
      {grid.map((item, index) => {
        // Only mount cards inside the viewport (+overscan). Off-screen cards are
        // removed from the DOM entirely, so node count, image memory, and paint
        // cost stay constant no matter how far you scroll the library.
        if (!visibleIds.has(item.id)) return null;

        const hasBeenSeen = seenIds.has(item.id);
        const shouldAnimateIn = imagesReady && !hasBeenSeen;

        return (
          <div
            key={item.id}
            data-key={item.id}
            className={[
              'item-wrapper',
              `item-wrapper--density-${iconDensity}`,
              `item-wrapper--hover-${hoverEffect}`,
              imagesReady ? 'item-wrapper--hydrated' : '',
              'item-wrapper--ready',
              shouldAnimateIn ? 'item-wrapper--entering' : '',
            ].filter(Boolean).join(' ')}
            style={{
              width: item.w,
              height: item.h,
              transform: `translate(${item.x}px, ${item.y}px)`,
              transitionDelay: shouldAnimateIn ? `${(index % 12) * stagger}s` : '0s',
              '--hover-scale': hoverScale,
            }}
          >
            <button
              type="button"
              className="item-hitarea"
              onClick={() => onItemClick?.(item)}
              aria-label={`Open ${item.title}`}
            >
              <div className={`item-img item-img--${iconShape}`} style={{ backgroundImage: `url(${item.img})` }}>
                {showPlayBadge && (
                  <span className="item-play-badge" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                    </svg>
                  </span>
                )}
                <div className={`item-copy${alwaysShowTitles ? ' item-copy--always-visible' : ''}`}>
                  <span>{item.title}</span>
                  {item.description ? <small>{item.description}</small> : null}
                </div>
              </div>
            </button>

            <button
              type="button"
              className={`favorite-toggle${item.isFavorite ? ' favorite-toggle--active' : ''}`}
              aria-label={item.isFavorite ? `Unfavorite ${item.title}` : `Favorite ${item.title}`}
              aria-pressed={item.isFavorite}
              onClick={() => onToggleFavorite?.(item.id)}
            >
              <span aria-hidden="true">{favoriteIconStyle === 'heart' ? (item.isFavorite ? '♥' : '♡') : (item.isFavorite ? '★' : '☆')}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Masonry;
