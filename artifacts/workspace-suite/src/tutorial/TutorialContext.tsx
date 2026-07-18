import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'wouter';
import { TUTORIAL_STEPS, TUTORIAL_STORAGE_KEY } from './steps';
import type { TutorialStep } from './types';
import { skipHomeIntroOnce } from '@/lib/homeIntro';
import { matchHelpQuery, stepsForRoute } from './helpNlp';

type TutorialContextValue = {
  active: boolean;
  stepIndex: number;
  step: TutorialStep | null;
  total: number;
  /** When set, only steps for this route are shown. */
  scopeRoute: string | null;
  start: () => void;
  /** Start (or restart) the tour scoped to a single page/route. */
  startForRoute: (route: string) => void;
  /** Parse natural language, navigate, and run that page's tutorial. */
  askHelp: (query: string) => { ok: true; label: string } | { ok: false; reason: string };
  next: () => void;
  prev: () => void;
  skip: () => void;
  finish: () => void;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [scopeRoute, setScopeRoute] = useState<string | null>(null);

  const activeSteps = useMemo(
    () => (scopeRoute ? stepsForRoute(scopeRoute) : TUTORIAL_STEPS),
    [scopeRoute],
  );

  const step = active ? (activeSteps[stepIndex] ?? null) : null;
  const total = activeSteps.length;

  const finish = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
    setActive(false);
    setStepIndex(0);
    setScopeRoute(null);
  }, []);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const goToStepRoute = useCallback(
    (route: string) => {
      if (location === route) return;
      if (route === '/') skipHomeIntroOnce();
      navigate(route);
    },
    [location, navigate],
  );

  const start = useCallback(() => {
    setScopeRoute(null);
    setStepIndex(0);
    setActive(true);
    goToStepRoute('/');
  }, [goToStepRoute]);

  const startForRoute = useCallback(
    (route: string) => {
      const pageSteps = stepsForRoute(route);
      if (pageSteps.length === 0) {
        start();
        return;
      }
      setScopeRoute(route);
      setStepIndex(0);
      setActive(true);
      goToStepRoute(route);
    },
    [goToStepRoute, start],
  );

  const askHelp = useCallback(
    (query: string) => {
      const match = matchHelpQuery(query);
      if (!match) {
        return {
          ok: false as const,
          reason: 'Could not match that to a page. Try “leads”, “quotes”, “notes”, or “proposals”.',
        };
      }
      startForRoute(match.page.route);
      return { ok: true as const, label: match.page.label };
    },
    [startForRoute],
  );

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i >= activeSteps.length - 1) {
        localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
        setActive(false);
        setScopeRoute(null);
        return 0;
      }
      return i + 1;
    });
  }, [activeSteps.length]);

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  // Navigate to the step's route when the active step changes.
  useEffect(() => {
    if (!active || !step) return;
    if (location !== step.route) {
      if (step.route === '/') skipHomeIntroOnce();
      navigate(step.route);
    }
  }, [active, step, location, navigate]);

  // Auto-offer the tour once after first successful login lands on Home app.
  useEffect(() => {
    const onReady = () => {
      if (localStorage.getItem(TUTORIAL_STORAGE_KEY)) return;
      if (localStorage.getItem('nexus_active_user')) {
        setScopeRoute(null);
        setStepIndex(0);
        setActive(true);
      }
    };
    window.addEventListener('nexus:app-ready', onReady);
    return () => window.removeEventListener('nexus:app-ready', onReady);
  }, []);

  const value = useMemo(
    () => ({
      active,
      stepIndex,
      step,
      total,
      scopeRoute,
      start,
      startForRoute,
      askHelp,
      next,
      prev,
      skip,
      finish,
    }),
    [
      active,
      stepIndex,
      step,
      total,
      scopeRoute,
      start,
      startForRoute,
      askHelp,
      next,
      prev,
      skip,
      finish,
    ],
  );

  return (
    <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used within TutorialProvider');
  return ctx;
}
