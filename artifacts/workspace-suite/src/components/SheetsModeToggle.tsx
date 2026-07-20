import { useEffect, useState } from 'react';
import { getSheetsMode, setSheetsMode, sheetsTargetLabel, type SheetsMode } from '@/lib/sheetsMode';
import { soundClick } from '@/lib/sounds';

/** Compact Live / Demo control for the left panel nav. Default = Demo. */
export function SheetsModeToggle() {
  const [mode, setMode] = useState<SheetsMode>(() => getSheetsMode());

  useEffect(() => {
    const onStorage = () => setMode(getSheetsMode());
    window.addEventListener('nexus:sheets-mode', onStorage);
    return () => window.removeEventListener('nexus:sheets-mode', onStorage);
  }, []);

  function toggle() {
    const next: SheetsMode = mode === 'demo' ? 'live' : 'demo';
    setSheetsMode(next);
    setMode(next);
    soundClick();
  }

  const isLive = mode === 'live';

  return (
    <button
      type="button"
      data-tour="sheets-mode"
      title={`Sheets write-back: ${sheetsTargetLabel(mode)}. Click to switch.`}
      aria-label={isLive ? 'Live mode — writing to Enquiry sheet' : 'Demo mode — writing to StarGTM Ops'}
      onClick={toggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 30,
        padding: '0 10px',
        borderRadius: 8,
        border: 0,
        cursor: 'pointer',
        flexShrink: 0,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: '0.04em',
        background: isLive ? 'rgba(239,68,68,0.22)' : 'rgba(0,247,142,0.18)',
        color: isLive ? '#fca5a5' : '#00f78e',
        transition: 'background .2s, color .2s',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: isLive ? '#ef4444' : '#00f78e',
          boxShadow: isLive ? '0 0 0 3px rgba(239,68,68,.25)' : '0 0 0 3px rgba(0,247,142,.2)',
        }}
      />
      {isLive ? 'LIVE' : 'DEMO'}
    </button>
  );
}

export default SheetsModeToggle;
