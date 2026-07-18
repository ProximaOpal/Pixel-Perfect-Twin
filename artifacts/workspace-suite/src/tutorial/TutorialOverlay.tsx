import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useTutorial } from './TutorialContext';
import type { TutorialPlacement } from './types';
import './Tutorial.css';

type Rect = { top: number; left: number; width: number; height: number };

const EMPTY: Rect = { top: 0, left: 0, width: 0, height: 0 };

function measure(selector?: string, padding = 10): Rect | null {
  if (!selector) return null;
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 && r.height < 2) return null;
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  return {
    top: Math.max(8, r.top - padding),
    left: Math.max(8, r.left - padding),
    width: Math.min(window.innerWidth - 16, r.width + padding * 2),
    height: Math.min(window.innerHeight - 16, r.height + padding * 2),
  };
}

function pickPlacement(
  preferred: TutorialPlacement | undefined,
  hole: Rect | null,
): TutorialPlacement {
  if (!hole || preferred === 'center') return 'center';
  if (preferred) {
    if (preferred === 'right' && hole.left + hole.width + 340 > window.innerWidth) return 'left';
    if (preferred === 'left' && hole.left < 340) return 'right';
    if (preferred === 'bottom' && hole.top + hole.height + 220 > window.innerHeight) return 'top';
    if (preferred === 'top' && hole.top < 220) return 'bottom';
    return preferred;
  }
  const spaceRight = window.innerWidth - (hole.left + hole.width);
  const spaceLeft = hole.left;
  const spaceBottom = window.innerHeight - (hole.top + hole.height);
  if (spaceRight > 320) return 'right';
  if (spaceLeft > 320) return 'left';
  if (spaceBottom > 200) return 'bottom';
  return 'top';
}

function cardStyle(placement: TutorialPlacement, hole: Rect | null): CSSProperties {
  if (!hole || placement === 'center') {
    return {
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }
  const gap = 28;
  switch (placement) {
    case 'right':
      return {
        position: 'fixed',
        left: Math.min(window.innerWidth - 340, hole.left + hole.width + gap),
        top: Math.min(window.innerHeight - 240, Math.max(16, hole.top + hole.height / 2 - 90)),
      };
    case 'left':
      return {
        position: 'fixed',
        left: Math.max(16, hole.left - 320 - gap),
        top: Math.min(window.innerHeight - 240, Math.max(16, hole.top + hole.height / 2 - 90)),
      };
    case 'bottom':
      return {
        position: 'fixed',
        left: Math.min(
          window.innerWidth - 340,
          Math.max(16, hole.left + hole.width / 2 - 160),
        ),
        top: Math.min(window.innerHeight - 240, hole.top + hole.height + gap),
      };
    case 'top':
    default:
      return {
        position: 'fixed',
        left: Math.min(
          window.innerWidth - 340,
          Math.max(16, hole.left + hole.width / 2 - 160),
        ),
        top: Math.max(16, hole.top - 200 - gap),
      };
  }
}

function arrowPath(placement: TutorialPlacement, hole: Rect, card: Rect): string {
  const hx = hole.left + hole.width / 2;
  const hy = hole.top + hole.height / 2;
  let x1 = card.left + card.width / 2;
  let y1 = card.top + card.height / 2;
  let x2 = hx;
  let y2 = hy;

  if (placement === 'right') {
    x1 = card.left;
    y1 = card.top + card.height * 0.4;
    x2 = hole.left + hole.width;
    y2 = hy;
  } else if (placement === 'left') {
    x1 = card.left + card.width;
    y1 = card.top + card.height * 0.4;
    x2 = hole.left;
    y2 = hy;
  } else if (placement === 'bottom') {
    x1 = card.left + card.width / 2;
    y1 = card.top;
    x2 = hx;
    y2 = hole.top + hole.height;
  } else if (placement === 'top') {
    x1 = card.left + card.width / 2;
    y1 = card.top + card.height;
    x2 = hx;
    y2 = hole.top;
  }

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const curve = Math.min(80, len * 0.35);
  const cx1 = mx - (dy / len) * curve;
  const cy1 = my + (dx / len) * curve;

  return `M ${x1} ${y1} Q ${cx1} ${cy1} ${x2} ${y2}`;
}

export function TutorialOverlay() {
  const { active, step, stepIndex, total, scopeRoute, next, prev, skip } = useTutorial();
  const [location] = useLocation();
  const [hole, setHole] = useState<Rect | null>(null);
  const [cardBox, setCardBox] = useState<Rect>(EMPTY);
  const [ready, setReady] = useState(false);
  const attempts = useRef(0);

  useEffect(() => {
    if (!active || !step) return;
    let cancelled = false;
    setReady(false);
    attempts.current = 0;

    const tryMeasure = () => {
      if (cancelled) return;
      if (location !== step.route) return;

      if (!step.selector) {
        setHole(null);
        setReady(true);
        return;
      }

      const rect = measure(step.selector, step.padding ?? 10);
      if (rect) {
        setHole(rect);
        setReady(true);
        return;
      }

      attempts.current += 1;
      if (attempts.current >= 12) {
        // Optional target never appeared — advance past it.
        next();
        return;
      }
      window.setTimeout(tryMeasure, 180);
    };

    const settle = window.setTimeout(tryMeasure, step.settleMs ?? 220);

    const onResize = () => {
      if (!step.selector) {
        setHole(null);
        return;
      }
      const rect = measure(step.selector, step.padding ?? 10);
      if (rect) setHole(rect);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);

    return () => {
      cancelled = true;
      window.clearTimeout(settle);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [active, step, location, next]);

  const placement = useMemo(
    () => pickPlacement(step?.placement, hole),
    [step?.placement, hole],
  );

  const style = useMemo(() => cardStyle(placement, hole), [placement, hole]);

  useLayoutEffect(() => {
    if (!ready) return;
    const el = document.querySelector('.nexus-tour-card') as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCardBox({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [ready, stepIndex, placement, hole]);

  const path =
    hole && placement !== 'center' && cardBox.width
      ? arrowPath(placement, hole, cardBox)
      : '';

  useEffect(() => {
    if (!active || !step?.selector || !ready) return;
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) return;
    const prevZ = el.style.zIndex;
    const prevPos = el.style.position;
    const prevFilter = el.style.filter;
    const computed = getComputedStyle(el).position;
    if (computed === 'static') el.style.position = 'relative';
    el.style.zIndex = '10040';
    el.style.filter = 'none';
    el.classList.add('nexus-tour-target');
    return () => {
      el.style.zIndex = prevZ;
      el.style.position = prevPos;
      el.style.filter = prevFilter;
      el.classList.remove('nexus-tour-target');
    };
  }, [active, step, ready]);

  return (
    <AnimatePresence>
      {active && step && ready && (
        <motion.div
          className="nexus-tour"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
        >
          <div
            className="nexus-tour-veil"
            onClick={skip}
            style={
              hole
                ? {
                    // evenodd path: full viewport minus spotlight rectangle
                    clipPath: `path(evenodd, "M0 0 H${typeof window !== 'undefined' ? window.innerWidth : 1920} V${typeof window !== 'undefined' ? window.innerHeight : 1080} H0 Z M${hole.left} ${hole.top} H${hole.left + hole.width} V${hole.top + hole.height} H${hole.left} Z")`,
                  }
                : undefined
            }
          />

          {hole && (
            <motion.div
              className="nexus-tour-ring"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.65, 0, 0.35, 1] }}
              style={{
                top: hole.top,
                left: hole.left,
                width: hole.width,
                height: hole.height,
              }}
            />
          )}

          {path && (
            <svg className="nexus-tour-arrows" aria-hidden>
              <defs>
                <linearGradient id="tourArrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00f78e" />
                  <stop offset="100%" stopColor="#0894ce" />
                </linearGradient>
                <marker
                  id="tourArrowHead"
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6 Z" fill="#0894ce" />
                </marker>
              </defs>
              <motion.path
                d={path}
                fill="none"
                stroke="url(#tourArrowGrad)"
                strokeWidth="2.4"
                strokeLinecap="round"
                markerEnd="url(#tourArrowHead)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
              />
            </svg>
          )}

          <motion.div
            key={step.id}
            className="nexus-tour-card"
            style={style}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.65, 0, 0.35, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nexus-tour-title"
          >
            <div className="nexus-tour-card-glow" />
            <div className="nexus-tour-meta">
              <span className="nexus-tour-eyebrow">
                {scopeRoute ? 'PAGE TOUR' : 'NEXUS TOUR'}
              </span>
              <span className="nexus-tour-progress">
                {stepIndex + 1} / {total}
              </span>
            </div>
            <h2 id="nexus-tour-title" className="nexus-tour-title">
              {step.title}
            </h2>
            <p className="nexus-tour-body">{step.body}</p>
            <div className="nexus-tour-actions">
              <button type="button" className="nexus-tour-btn ghost" onClick={skip}>
                Skip tour
              </button>
              <div className="nexus-tour-actions-right">
                {stepIndex > 0 && (
                  <button type="button" className="nexus-tour-btn ghost" onClick={prev}>
                    Back
                  </button>
                )}
                <button type="button" className="nexus-tour-btn primary" onClick={next}>
                  {stepIndex >= total - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
            <div className="nexus-tour-track">
              <div
                className="nexus-tour-track-fill"
                style={{ width: `${((stepIndex + 1) / total) * 100}%` }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
