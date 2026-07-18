/**
 * Help control for PanelNav — opens a menu of help options including
 * a natural-language query that jumps to a page tour.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CircleHelp, Compass, MapPin, MessageSquareText, Send, X,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useTutorial } from '@/tutorial';
import { HELP_PAGES } from '@/tutorial/helpNlp';
import '@/tutorial/Tutorial.css';

export function HelpMenu() {
  const [location] = useLocation();
  const { active, start, startForRoute, askHelp } = useTutorial();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'menu' | 'ask'>('menu');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function placePanel() {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const width = Math.min(300, window.innerWidth - 16);
    let left = r.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (left < 8) left = 8;
    let top = r.bottom + 10;
    // Prefer below; if near bottom of viewport, open above once we know height.
    const approxH = mode === 'ask' ? 260 : 280;
    if (top + approxH > window.innerHeight - 8) {
      top = Math.max(8, r.top - approxH - 10);
    }
    setPos({ top, left });
  }

  useLayoutEffect(() => {
    if (!open) return;
    placePanel();
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => placePanel();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
      setMode('menu');
      setError(null);
      setHint(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setMode('menu');
      }
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || mode !== 'ask') return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open, mode]);

  // Close the menu when a tour starts so the spotlight can take over.
  useEffect(() => {
    if (active) {
      setOpen(false);
      setMode('menu');
      setQuery('');
      setError(null);
      setHint(null);
    }
  }, [active]);

  function submitAsk() {
    const result = askHelp(query);
    if (!result.ok) {
      setError(result.reason);
      setHint(null);
      return;
    }
    setHint(`Opening ${result.label} tour…`);
    setError(null);
  }

  const currentPage =
    HELP_PAGES.find(p => p.route === location) ?? HELP_PAGES[0];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-tour="tour-trigger"
        data-help="help-trigger"
        aria-label="Help"
        aria-expanded={open}
        title="Help"
        onClick={() => {
          setOpen(o => !o);
          setMode('menu');
          setError(null);
          setHint(null);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 30,
          height: 30,
          borderRadius: 8,
          border: 0,
          cursor: 'pointer',
          background: open || active ? 'rgba(0,247,142,0.22)' : 'rgba(255,255,255,0.10)',
          color: open || active ? '#00f78e' : 'rgba(255,255,255,0.55)',
          transition: 'background .2s, color .2s',
          flexShrink: 0,
        }}
      >
        <CircleHelp size={13} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              className="nexus-help-panel"
              style={{ position: 'fixed', top: pos.top, left: pos.left, right: 'auto' }}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              role="dialog"
              aria-label="Help options"
            >
              <div className="nexus-help-head">
                <div>
                  <p className="nexus-help-eyebrow">NEXUS HELP</p>
                  <p className="nexus-help-title">
                    {mode === 'ask' ? 'Ask in plain English' : 'How can we help?'}
                  </p>
                </div>
                <button
                  type="button"
                  className="nexus-help-close"
                  aria-label="Close help"
                  onClick={() => { setOpen(false); setMode('menu'); }}
                >
                  <X size={14} />
                </button>
              </div>

              {mode === 'menu' ? (
                <div className="nexus-help-options">
                  <button
                    type="button"
                    className="nexus-help-option"
                    onClick={() => start()}
                  >
                    <span className="nexus-help-option-icon" style={{ background: 'rgba(0,247,142,.16)' }}>
                      <Compass size={15} color="#06c97a" />
                    </span>
                    <span className="nexus-help-option-text">
                      <span className="nexus-help-option-label">Full product tour</span>
                      <span className="nexus-help-option-desc">Walk through every page and major feature</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="nexus-help-option"
                    onClick={() => startForRoute(currentPage.route)}
                  >
                    <span className="nexus-help-option-icon" style={{ background: 'rgba(8,148,206,.16)' }}>
                      <MapPin size={15} color="#0894ce" />
                    </span>
                    <span className="nexus-help-option-text">
                      <span className="nexus-help-option-label">Tour this page</span>
                      <span className="nexus-help-option-desc">Guide for {currentPage.label} only</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="nexus-help-option"
                    onClick={() => { setMode('ask'); setError(null); setHint(null); }}
                  >
                    <span className="nexus-help-option-icon" style={{ background: 'rgba(62,79,134,.16)' }}>
                      <MessageSquareText size={15} color="#3e4f86" />
                    </span>
                    <span className="nexus-help-option-text">
                      <span className="nexus-help-option-label">Ask with natural language</span>
                      <span className="nexus-help-option-desc">Type what you need — we open that page’s tour</span>
                    </span>
                  </button>
                </div>
              ) : (
                <div className="nexus-help-ask">
                  <p className="nexus-help-ask-hint">
                    Examples: “show me leads”, “how do I build a quote”, “progress notes next action”
                  </p>
                  <textarea
                    ref={inputRef}
                    className="nexus-help-input"
                    rows={3}
                    value={query}
                    placeholder="What do you want help with?"
                    onChange={e => { setQuery(e.target.value); setError(null); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitAsk();
                      }
                    }}
                  />
                  {error && <p className="nexus-help-error">{error}</p>}
                  {hint && <p className="nexus-help-success">{hint}</p>}
                  <div className="nexus-help-ask-actions">
                    <button
                      type="button"
                      className="nexus-help-back"
                      onClick={() => { setMode('menu'); setError(null); setHint(null); }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="nexus-help-go"
                      disabled={!query.trim()}
                      onClick={submitAsk}
                    >
                      <Send size={13} /> Go
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

export default HelpMenu;
