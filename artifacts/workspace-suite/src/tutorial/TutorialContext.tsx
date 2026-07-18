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

type TutorialContextValue = {
  active: boolean;
  stepIndex: number;
  step: TutorialStep | null;
  total: number;
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  finish: () => void;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

function resolveStep(index: number): TutorialStep | null {
  return TUTORIAL_STEPS[index] ?? null;
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const step = active ? resolveStep(stepIndex) : null;
  const total = TUTORIAL_STEPS.length;

  const finish = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
    setActive(false);
    setStepIndex(0);
  }, []);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
    if (location !== '/') {
      skipHomeIntroOnce();
      navigate('/');
    }
  }, [location, navigate]);

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i >= TUTORIAL_STEPS.length - 1) {
        localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
        setActive(false);
        return 0;
      }
      return i + 1;
    });
  }, []);

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
      start,
      next,
      prev,
      skip,
      finish,
    }),
    [active, stepIndex, step, total, start, next, prev, skip, finish],
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
