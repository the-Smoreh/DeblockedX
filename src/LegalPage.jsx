import { useEffect, useRef } from 'react';
import { LEGAL_PAGES, LEGAL_NAV, LAST_UPDATED } from './legal';
import './legal.css';

/*
 * Legal pages render as a full overlay rather than a modal: they are long,
 * they need to be readable and printable on their own, and a takedown notice
 * sender should be able to land on one directly from a shared URL.
 *
 * Routing is the page's own hash (#/privacy) so the URL is linkable and
 * bookmarkable without pulling in a router for three static documents.
 */
export default function LegalPage({ page, onNavigate, onClose }) {
  const doc = LEGAL_PAGES[page];
  const panelRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Move focus to the top of the document on open and on each tab change, so
  // the content is not silently swapped underneath a screen reader.
  //
  // preventScroll matters here: focusing the panel otherwise scrolls it into
  // view inside the overlay, which pushes the h1 up under the sticky header.
  // The reset has to target the overlay, which is the actual scroll container
  // -- the panel itself does not scroll.
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    scrollRef.current?.scrollTo(0, 0);
  }, [page]);

  if (!doc) return null;

  return (
    <div className="lgl" role="dialog" aria-modal="true" aria-label={doc.title} ref={scrollRef}>
      <div className="lgl__panel" ref={panelRef} tabIndex={-1}>
        <header className="lgl__head">
          <nav className="lgl__tabs" aria-label="Legal pages">
            {LEGAL_NAV.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`lgl__tab${id === page ? ' is-active' : ''}`}
                aria-current={id === page ? 'page' : undefined}
                onClick={() => onNavigate(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <button type="button" className="lgl__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
              strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        <article className="lgl__doc">
          <h1>{doc.title}</h1>
          <p className="lgl__updated">Last updated {LAST_UPDATED}</p>
          <p className="lgl__intro">{doc.intro}</p>

          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.body.map((para) => <p key={para}>{para}</p>)}
              {section.list && (
                <ul>
                  {section.list.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
              {section.after?.map((para) => <p key={para}>{para}</p>)}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
