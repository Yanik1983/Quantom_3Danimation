/**
 * Sound effects, synthesised with the Web Audio API (no audio files). The audio context starts
 * on the visitor's first click or key press, as browsers require; until then, and while sound
 * is switched off, every call is a no-op. Each effect builds a few short-lived audio nodes that
 * the browser frees when they stop; per-frame callers are rate-limited so bursts stay cheap.
 */
import { useSettings } from '../state/settings';
import { RateLimiter, resultFrequency } from './soundMath';

let ctx: AudioContext | null = null;
let master: GainNode;
let noise: AudioBuffer;
let ambient: { stop(): void } | null = null;

const MASTER_GAIN = 0.32;
const ticks = new RateLimiter(0.028);
const pairs = new RateLimiter(0.045);

function ready(): AudioContext | null {
  if (!ctx || !useSettings.getState().sound) return null;
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Output with an optional left/right position (−1 … 1). */
function out(pan = 0): AudioNode {
  if (!pan) return master;
  const p = ctx!.createStereoPanner();
  p.pan.value = pan;
  p.connect(master);
  return p;
}

/** A gain node with a quick attack and exponential decay, starting at `t`. */
function envelope(t: number, peak: number, attack: number, decay: number, to: AudioNode): GainNode {
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(to);
  return g;
}

function tone(
  freq: number,
  t: number,
  { type = 'sine', peak = 0.3, attack = 0.005, decay = 0.25, pan = 0, glideTo = 0, glideTime = 0.1 } = {} as {
    type?: OscillatorType;
    peak?: number;
    attack?: number;
    decay?: number;
    pan?: number;
    glideTo?: number;
    glideTime?: number;
  },
): OscillatorNode {
  const o = ctx!.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + glideTime);
  o.connect(envelope(t, peak, attack, decay, out(pan)));
  o.start(t);
  o.stop(t + attack + decay + 0.05);
  return o;
}

function noiseBurst(
  t: number,
  { filter = 'bandpass', freq = 2000, q = 1, peak = 0.2, attack = 0.002, decay = 0.05, sweepTo = 0 } = {} as {
    filter?: BiquadFilterType;
    freq?: number;
    q?: number;
    peak?: number;
    attack?: number;
    decay?: number;
    sweepTo?: number;
  },
) {
  const src = ctx!.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx!.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) {
    f.frequency.exponentialRampToValueAtTime(sweepTo, t + (attack + decay) / 2);
    f.frequency.exponentialRampToValueAtTime(freq, t + attack + decay);
  }
  f.Q.value = q;
  src.connect(f);
  f.connect(envelope(t, peak, attack, decay, master));
  src.start(t, Math.random() * 0.5);
  src.stop(t + attack + decay + 0.05);
}

/** The refrigerator's pulse-tube pump (a soft "chuff" about every 1.4 s) over a low electrical hum. */
function startAmbient(): { stop(): void } {
  const c = ctx!;
  const bus = c.createGain();
  bus.gain.value = 0;
  bus.gain.linearRampToValueAtTime(0.5, c.currentTime + 2);
  bus.connect(master);

  const hum = [55, 110, 165].map((f, i) => {
    const o = c.createOscillator();
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.value = [0.07, 0.035, 0.012][i];
    o.connect(g).connect(bus);
    o.start();
    return o;
  });

  const period = 1.4;
  const rate = c.sampleRate;
  const buf = c.createBuffer(1, Math.round(period * rate), rate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / rate;
    const shape = Math.exp(-((t - 0.25) ** 2) / 0.008) + 0.5 * Math.exp(-((t - 0.95) ** 2) / 0.02);
    d[i] = (Math.random() * 2 - 1) * shape * 0.5;
  }
  const chuff = c.createBufferSource();
  chuff.buffer = buf;
  chuff.loop = true;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 500;
  chuff.connect(lp).connect(bus);
  chuff.start();

  return {
    stop() {
      const now = c.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.linearRampToValueAtTime(0, now + 0.4);
      for (const o of hum) o.stop(now + 0.5);
      chuff.stop(now + 0.5);
    },
  };
}

function syncAmbient() {
  const { sound, ambient: want } = useSettings.getState();
  const on = !!ctx && sound && want && document.visibilityState === 'visible';
  if (on && !ambient) ambient = startAmbient();
  else if (!on && ambient) {
    ambient.stop();
    ambient = null;
  }
}

/** Waits for the first click or key press, then creates the audio context. Returns a cleanup. */
export function initSound(): () => void {
  const start = () => {
    if (ctx || typeof AudioContext === 'undefined') return;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    syncAmbient();
  };
  window.addEventListener('pointerdown', start, { capture: true });
  window.addEventListener('keydown', start, { capture: true });
  document.addEventListener('visibilitychange', syncAmbient);
  const unsub = useSettings.subscribe((s, prev) => {
    if (s.sound !== prev.sound || s.ambient !== prev.ambient) syncAmbient();
  });
  return () => {
    window.removeEventListener('pointerdown', start, { capture: true });
    window.removeEventListener('keydown', start, { capture: true });
    document.removeEventListener('visibilitychange', syncAmbient);
    unsub();
    ambient?.stop();
    ambient = null;
    void ctx?.close();
    ctx = null;
  };
}

export const sound = {
  /** A particle lands on the screen: a Geiger-counter tick (many at once blend into a patter). */
  tick() {
    const c = ready();
    if (!c || !ticks.allow(c.currentTime)) return;
    noiseBurst(c.currentTime, {
      filter: 'highpass',
      freq: 2500 + Math.random() * 2500,
      peak: 0.12,
      decay: 0.012,
    });
  },
  /** Detectors switched: a relay click. */
  relay() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    noiseBurst(t, { freq: 1200, q: 4, peak: 0.35, decay: 0.02 });
    noiseBurst(t + 0.045, { freq: 900, q: 4, peak: 0.25, decay: 0.03 });
  },
  /** A measurement: a pop whose pitch is the result (low for 0, higher for larger results). */
  measure(index: number, count: number, when = 0) {
    const c = ready();
    if (!c) return;
    const f = resultFrequency(index, count);
    tone(f * 1.5, c.currentTime + when, { peak: 0.28, decay: 0.14, glideTo: f, glideTime: 0.04 });
  },
  /** Many measurements in a quick ripple, one pop each. */
  measureMany(results: ArrayLike<number>, count: number) {
    for (let i = 0; i < results.length; i++) this.measure(results[i], count, i * 0.014);
  },
  /** A pair flies apart, or the camera glides: a soft whoosh. */
  whoosh(peak = 0.12) {
    const c = ready();
    if (!c) return;
    noiseBurst(c.currentTime, { freq: 300, sweepTo: 1600, q: 1.2, peak, attack: 0.25, decay: 0.45 });
  },
  /** The two detectors read their bits: one tone per side, left and right. */
  pair(left: number, right: number) {
    const c = ready();
    if (!c || !pairs.allow(c.currentTime)) return;
    const t = c.currentTime;
    tone(resultFrequency(left, 2), t, { type: 'triangle', peak: 0.22, decay: 0.3, pan: -0.8 });
    tone(resultFrequency(right, 2), t, { type: 'triangle', peak: 0.22, decay: 0.3, pan: 0.8 });
  },
  /** An empty cup is lifted: a soft thud. */
  thud() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    tone(140, t, { peak: 0.45, decay: 0.18, glideTo: 70, glideTime: 0.12 });
    noiseBurst(t, { filter: 'lowpass', freq: 600, peak: 0.2, decay: 0.06 });
  },
  /** The card is found: a bright chime. */
  chime() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    [1046.5, 1318.5, 1568, 2093].forEach((f, i) =>
      tone(f, t + i * 0.07, { type: 'triangle', peak: 0.16, decay: 1.1 }),
    );
  },
  /** Spread: the qubits become a mix of all four cups — a shimmering chord. */
  spread() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    [523.25, 659.25, 783.99, 987.77].forEach((f, i) => {
      tone(f, t + i * 0.03, { peak: 0.08, attack: 0.15, decay: 0.8 });
      tone(f * 1.004, t + i * 0.03, { peak: 0.05, attack: 0.15, decay: 0.8 });
    });
  },
  /** Mark: the right cup's wave flips upside down — a quick up-and-down blip. */
  flip() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    tone(600, t, { type: 'triangle', peak: 0.25, decay: 0.09, glideTo: 1200, glideTime: 0.07 });
    tone(1200, t + 0.08, { type: 'triangle', peak: 0.2, decay: 0.1, glideTo: 600, glideTime: 0.08 });
  },
  /** Cancel: two wobbling tones (beats) settle into one clear tone, like waves combining. */
  cancel() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    tone(440, t, { peak: 0.14, attack: 0.05, decay: 1.4 });
    tone(452, t, { peak: 0.14, attack: 0.05, decay: 1.4, glideTo: 440.5, glideTime: 0.9 });
  },
  /** The finale: a short, soft fanfare. */
  fanfare() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(f, t + i * 0.12, { type: 'triangle', peak: 0.16, decay: i === 3 ? 1.2 : 0.35 }),
    );
  },
};
