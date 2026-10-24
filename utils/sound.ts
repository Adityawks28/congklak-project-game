// Small synthesized sounds (Web Audio, no files): a "tok" per marble, a clack
// on capture, a rising chime for another turn, and a fanfare for the win.
type Kind = 'drop' | 'capture' | 'extra' | 'win';

let enabled = true;
let ctx: AudioContext | null = null;
let lastDrop = 0;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

function audio(): AudioContext | null {
  if (!enabled || typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// Call from a click handler: browsers only let audio start inside a user gesture.
export function primeSound(): void {
  audio();
}

function tone(c: AudioContext, freq: number, dur: number, type: OscillatorType, gain: number, at = 0, to?: number) {
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function playSound(kind: Kind): void {
  const c = audio();
  if (!c) return;
  if (kind === 'drop') {
    const now = performance.now();
    if (now - lastDrop < 40) return;
    lastDrop = now;
    tone(c, 900, 0.06, 'triangle', 0.18, 0, 480);
  } else if (kind === 'capture') {
    tone(c, 220, 0.18, 'square', 0.1, 0, 110);
    tone(c, 330, 0.14, 'triangle', 0.15, 0.05, 160);
  } else if (kind === 'extra') {
    [523, 659, 784].forEach((f, i) => tone(c, f, 0.16, 'sine', 0.15, i * 0.08));
  } else {
    [523, 659, 784, 1047].forEach((f, i) => tone(c, f, 0.22, 'sine', 0.14, i * 0.11));
  }
}
