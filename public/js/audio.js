// Lightweight Web Audio: synthesized SFX + anthem melodies (no asset files).

let ctx = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const NOTE_FREQ = {
  C4: 261.63, 'C#4': 277.18, D4: 293.66, 'D#4': 311.13, E4: 329.63,
  F4: 349.23, 'F#4': 369.99, G4: 392.0, 'G#4': 415.3, A4: 440.0,
  'A#4': 466.16, B4: 493.88,
  C5: 523.25, 'C#5': 554.37, D5: 587.33, 'D#5': 622.25, E5: 659.25,
  F5: 698.46, 'F#5': 739.99, G5: 783.99, 'G#5': 830.61, A5: 880.0,
  'A#5': 932.33, B5: 987.77,
};

export function unlockAudio() {
  ac();
}

function tone(freq, start, dur, type = 'sine', gain = 0.2) {
  const c = ac();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
  return osc;
}

function noise(start, dur, gain = 0.3) {
  const c = ac();
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = gain;
  const filt = c.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 800;
  src.connect(filt).connect(g).connect(c.destination);
  src.start(start);
}

export function sfxHit() {
  const c = ac();
  const t = c.currentTime;
  noise(t, 0.5, 0.45);
  tone(80, t, 0.4, 'sawtooth', 0.3);
}

export function sfxMiss() {
  const c = ac();
  const t = c.currentTime;
  noise(t, 0.35, 0.18);
  tone(220, t, 0.15, 'sine', 0.08);
}

export function sfxSunk() {
  const c = ac();
  const t = c.currentTime;
  noise(t, 0.9, 0.5);
  tone(60, t, 0.8, 'sawtooth', 0.35);
  tone(45, t + 0.1, 0.7, 'square', 0.25);
}

export function sfxClick() {
  const c = ac();
  tone(660, c.currentTime, 0.06, 'square', 0.05);
}

let anthemNodes = [];
export function playAnthem(notes, { loser = false } = {}) {
  stopAnthem();
  const c = ac();
  let t = c.currentTime + 0.05;
  const beat = 0.32;
  notes.forEach((n) => {
    let freq = NOTE_FREQ[n] || 440;
    if (loser) freq /= 2; // mournful, lower octave
    anthemNodes.push(tone(freq, t, beat * 0.9, loser ? 'sawtooth' : 'triangle', loser ? 0.12 : 0.22));
    // light brass harmony
    if (!loser) anthemNodes.push(tone(freq / 2, t, beat * 0.9, 'sine', 0.07));
    t += beat;
  });
}

export function stopAnthem() {
  anthemNodes.forEach((osc) => {
    try {
      osc.stop();
    } catch (e) {
      /* already stopped */
    }
  });
  anthemNodes = [];
}
