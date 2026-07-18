// Lightweight Web Audio API sound palette — no external files, fully procedural.

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!_ctx || _ctx.state === 'closed') {
      _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (_ctx.state === 'suspended') void _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  endFreq: number,
  duration: number,
  peakGain: number,
  type: OscillatorType = 'sine',
  startDelay = 0,
) {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime + startDelay;

  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  const hi = ctx.createBiquadFilter();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);

  hi.type = 'highpass';
  hi.frequency.value = 80;

  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(peakGain, t + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  osc.connect(hi);
  hi.connect(env);
  env.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export function soundClick() {
  tone(680, 580, 0.07, 0.11, 'sine');
}

export function soundOpen() {
  tone(380, 820, 0.15, 0.10, 'sine');
  tone(760, 960, 0.08, 0.05, 'triangle', 0.05);
}

export function soundClose() {
  tone(820, 360, 0.12, 0.09, 'sine');
}

export function soundTab() {
  tone(1020, 1020, 0.04, 0.08, 'triangle');
}
