/**
 * Live / Demo mode for Google Sheets write-back.
 * Demo (default) → Nexus Ops tab. Live → Enquiry - Lead Data (2026).
 */
export type SheetsMode = 'demo' | 'live';

const STORAGE_KEY = 'nexus_sheets_mode';
const EVENT = 'nexus:sheets-mode';

export function getSheetsMode(): SheetsMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'live' ? 'live' : 'demo';
  } catch {
    return 'demo';
  }
}

export function setSheetsMode(mode: SheetsMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch (err) {
    console.warn('[nexus] sheets mode localStorage write failed', err);
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: mode }));
}

export function subscribeSheetsMode(cb: (mode: SheetsMode) => void): () => void {
  const handler = () => cb(getSheetsMode());
  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function sheetsTargetLabel(mode: SheetsMode = getSheetsMode()): string {
  return mode === 'live' ? 'Enquiry - Lead Data (2026)' : 'Nexus Ops (Demo)';
}
