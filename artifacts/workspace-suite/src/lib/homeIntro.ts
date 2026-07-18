/** Session flag: product tour sets this before navigating to `/` so intro is skipped once. */
export const HOME_INTRO_SKIP_KEY = 'nexus_skip_home_intro';

/** Window event: replay the full Home landing → wipe → login sequence. */
export const HOME_INTRO_EVENT = 'nexus:play-home-intro';

export function skipHomeIntroOnce() {
  sessionStorage.setItem(HOME_INTRO_SKIP_KEY, '1');
}

export function consumeSkipIntro(): boolean {
  if (sessionStorage.getItem(HOME_INTRO_SKIP_KEY) === '1') {
    sessionStorage.removeItem(HOME_INTRO_SKIP_KEY);
    return Boolean(localStorage.getItem('nexus_active_user'));
  }
  return false;
}

export function playHomeIntro() {
  window.dispatchEvent(new Event(HOME_INTRO_EVENT));
}
