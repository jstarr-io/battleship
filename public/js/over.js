// Game-over scene: winner's ship sails the ocean with a waving flag while the
// loser's ship sinks beneath the waves. Anthem snippet plays via audio.js.

import { flagHTML, anthemNotes } from './countries.js';
import { playAnthem, stopAnthem } from './audio.js';

function flagImage(country) {
  return new Promise((resolve) => {
    // Give the SVG an explicit size so the canvas has a well-defined intrinsic
    // resolution to sample from (otherwise only the top-left corner is read).
    const markup = flagHTML(country).replace('<svg ', '<svg width="240" height="160" ');
    const blob = new Blob([markup], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

let rafId = null;

export async function playGameOver(canvas, { youWon, youCountry, oppCountry }) {
  cancelAnimationFrame(rafId);
  stopAnthem();
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const winnerCountry = youWon ? youCountry : oppCountry;
  const loserCountry = youWon ? oppCountry : youCountry;

  const [winFlag, loseFlag] = await Promise.all([
    flagImage(winnerCountry),
    flagImage(loserCountry),
  ]);

  playAnthem(anthemNotes(winnerCountry));

  const start = performance.now();
  function frame(now) {
    const t = (now - start) / 1000;
    drawScene(ctx, W, H, t, { winFlag, loseFlag });
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);
}

export function stopGameOver() {
  cancelAnimationFrame(rafId);
  stopAnthem();
}

function drawScene(ctx, W, H, t, { winFlag, loseFlag }) {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1b2a33');
  sky.addColorStop(1, '#33464f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Sun glow
  ctx.save();
  ctx.globalAlpha = 0.25;
  const g = ctx.createRadialGradient(W * 0.8, H * 0.25, 10, W * 0.8, H * 0.25, 180);
  g.addColorStop(0, '#e8c98a');
  g.addColorStop(1, 'rgba(232,201,138,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  const seaY = H * 0.55;

  // Sinking loser ship (left-ish), sinks over ~4s
  const sink = Math.min(1, t / 4);
  const loseX = W * 0.3;
  const loseY = seaY - 10 + sink * 120;
  const tilt = sink * 0.6;
  drawShip(ctx, loseX, loseY, tilt, loseFlag, 0.9 - sink * 0.5, true);

  // Sea (drawn over lower part of loser to show submersion)
  drawSea(ctx, W, H, seaY, t);

  // Winner ship sailing across, bobbing
  const winX = (W * 0.15 + t * 60) % (W + 240) - 120;
  const bob = Math.sin(t * 2) * 6;
  drawShip(ctx, winX, seaY - 18 + bob, Math.sin(t * 2) * 0.04, winFlag, 1, false, t);
}

function drawSea(ctx, W, H, seaY, t) {
  const grad = ctx.createLinearGradient(0, seaY, 0, H);
  grad.addColorStop(0, '#1f5f6b');
  grad.addColorStop(1, '#0b2b33');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, seaY);
  for (let x = 0; x <= W; x += 10) {
    const y = seaY + Math.sin(x * 0.03 + t * 2) * 6 + Math.sin(x * 0.07 + t * 3) * 3;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // foam highlights
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 10) {
    const y = seaY + Math.sin(x * 0.03 + t * 2) * 6 + Math.sin(x * 0.07 + t * 3) * 3;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawShip(ctx, x, y, tilt, flag, alpha, sinking, t = 0) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(x, y);
  ctx.rotate(tilt);

  // hull
  ctx.fillStyle = sinking ? '#5a4632' : '#3a3f44';
  ctx.beginPath();
  ctx.moveTo(-60, 0);
  ctx.lineTo(60, 0);
  ctx.lineTo(44, 26);
  ctx.lineTo(-44, 26);
  ctx.closePath();
  ctx.fill();

  // deck structure
  ctx.fillStyle = sinking ? '#6b5640' : '#52595f';
  ctx.fillRect(-22, -22, 44, 22);
  // smokestack
  ctx.fillStyle = '#2b2f33';
  ctx.fillRect(-6, -40, 12, 18);

  // mast + flag
  ctx.strokeStyle = '#cdb78a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(0, -78);
  ctx.stroke();

  if (flag) {
    const fw = 54;
    const fh = 36;
    const wave = sinking ? 0 : Math.sin(t * 6) * 4;
    const srcW = flag.naturalWidth || flag.width || 240;
    const srcH = flag.naturalHeight || flag.height || 160;
    ctx.save();
    ctx.translate(2, -78);
    // waving flag: slice into vertical strips offset by a sine wave
    const strips = 9;
    for (let i = 0; i < strips; i++) {
      const sx = (fw / strips) * i;
      const off = Math.sin(t * 6 + i * 0.6) * (sinking ? 0 : 3);
      ctx.drawImage(
        flag,
        (srcW / strips) * i, 0, srcW / strips, srcH,
        sx, off + wave * (i / strips), fw / strips + 0.5, fh
      );
    }
    ctx.restore();
  }

  ctx.restore();
}
