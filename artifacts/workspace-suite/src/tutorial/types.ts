export type TutorialPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'center';

export type TutorialStep = {
  id: string;
  route: string;
  /** CSS selector for the spotlight target. Omit for centered welcome cards. */
  selector?: string;
  title: string;
  body: string;
  placement?: TutorialPlacement;
  /** Extra padding around the spotlight cutout (px). */
  padding?: number;
  /** Wait this many ms after navigation before measuring the target. */
  settleMs?: number;
};
