// Entry gate: drag the cursor to wipe fog off the Uncle Sam poster, then
// answer "Who is this?" Correct answer (Uncle Sam) unlocks the site.

import { sfxClick } from './audio.js';

const ACCEPTED = ['uncle sam', 'unclesam', 'uncle samuel', 'sam'];

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function initEntry(onPass) {
  const canvas = document.getElementById('reveal-canvas');
  const ctx = canvas.getContext('2d');
  const frame = canvas.parentElement;
  const questionEl = document.getElementById('entry-question');
  const answerEl = document.getElementById('entry-answer');
  const submitEl = document.getElementById('entry-submit');
  const feedbackEl = document.getElementById('entry-feedback');
  const instruction = document.getElementById('entry-instruction');

  // Poster shown beneath the fog.
  const img = new Image();
  img.src = 'assets/unclesam.jpg';
  img.onload = () => {
    frame.style.backgroundImage = `url('assets/unclesam.jpg')`;
  };

  // Paint the fog of war.
  function paintFog() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // subtle noise
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let i = 0; i < 200; i++) {
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '500 12px "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '6px';
    ctx.fillText('CLASSIFIED', canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillText('— wipe to reveal —', canvas.width / 2, canvas.height / 2 + 20);
  }
  paintFog();

  let revealed = false;

  function erase(x, y) {
    ctx.globalCompositeOperation = 'destination-out';
    const r = 38;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    // Solid core so wiped areas become fully transparent, soft outer edge.
    grd.addColorStop(0, 'rgba(0,0,0,1)');
    grd.addColorStop(0.7, 'rgba(0,0,0,1)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function clearedPct() {
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    let clear = 0;
    const step = 40; // sample every Nth pixel for speed
    let total = 0;
    for (let i = 3; i < data.length; i += 4 * step) {
      total++;
      if (data[i] < 128) clear++; // count substantially-wiped pixels
    }
    return clear / total;
  }

  function pos(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x: cx * sx, y: cy * sy };
  }

  let lastCheck = 0;
  function onMove(e) {
    if (revealed) return;
    const { x, y } = pos(e);
    erase(x, y);
    const now = Date.now();
    if (now - lastCheck > 250) {
      lastCheck = now;
      if (clearedPct() > 0.5) doReveal();
    }
  }

  function doReveal() {
    if (revealed) return;
    revealed = true;
    // Fade remaining fog away.
    canvas.style.transition = 'opacity 0.8s ease';
    canvas.style.opacity = '0';
    instruction.textContent = 'Identify the figure to enlist.';
    questionEl.classList.remove('hidden');
    setTimeout(() => answerEl.focus(), 400);
  }

  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    onMove(e);
  });

  function submit() {
    const val = normalize(answerEl.value);
    if (!val) return;
    if (ACCEPTED.includes(val)) {
      feedbackEl.textContent = 'Correct, soldier. Welcome aboard.';
      feedbackEl.className = 'feedback ok';
      sfxClick();
      setTimeout(onPass, 800);
    } else {
      feedbackEl.textContent = 'Incorrect. Look again, recruit.';
      feedbackEl.className = 'feedback err';
      answerEl.classList.add('shake');
      setTimeout(() => answerEl.classList.remove('shake'), 500);
    }
  }

  submitEl.addEventListener('click', submit);
  answerEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
}
