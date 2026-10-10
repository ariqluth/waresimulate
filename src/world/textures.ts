import * as THREE from 'three';
import { CARRIERS, SITE_BY_CODE } from '../data/sites';
import type { CarrierId, SiteCode } from '../data/types';

const cache = new Map<string, THREE.Texture>();

function canvasTexture(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat = false) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  cache.set(key, tex);
  return tex;
}

// ---- MPM Group building signage -----------------------------------------------------------
// The official logo is read from public/brand/ (SVG preferred, PNG otherwise). Until the file
// exists the signs show the company name as text, and redraw as soon as the logo has loaded.

const LOGO_URLS = ['/brand/mpm-logo.svg', '/brand/mpm-logo.png'];
export const BRAND = { name: 'MPM Group', legal: 'PT Mitra Pinasthika Mustika Tbk' };

let logo: HTMLImageElement | null = null;
let logoRequested = false;
const brandRedraws: (() => void)[] = [];

function requestLogo() {
  if (logoRequested) return;
  logoRequested = true;
  const tryAt = (i: number) => {
    if (i >= LOGO_URLS.length) return;
    const img = new Image();
    img.onload = () => {
      logo = img;
      brandRedraws.forEach((redraw) => redraw());
    };
    img.onerror = () => tryAt(i + 1);
    img.src = LOGO_URLS[i];
  };
  tryAt(0);
  // Canvas text drawn before Inter has loaded falls back to a system font; redraw once it is ready.
  document.fonts?.ready.then(() => brandRedraws.forEach((redraw) => redraw()));
}

/** Draw the logo inside a box, keeping its aspect ratio. Returns the drawn width. */
function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, maxW: number, maxH: number, centre = false) {
  if (!logo) return 0;
  const iw = logo.naturalWidth || 300;
  const ih = logo.naturalHeight || 100;
  const s = Math.min(maxW / iw, maxH / ih);
  const w = iw * s;
  const h = ih * s;
  ctx.drawImage(logo, centre ? x + (maxW - w) / 2 : x, y + (maxH - h) / 2, w, h);
  return w;
}

function brandTexture(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  requestLogo();
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const redraw = () => {
    ctx.clearRect(0, 0, w, h);
    draw(ctx);
    tex.needsUpdate = true;
  };
  redraw();
  brandRedraws.push(redraw);
  cache.set(key, tex);
  return tex;
}

/** Facade sign: logo, company name, legal name and the site line. Aspect 768 × 200. */
export function siteSign(code: SiteCode) {
  const site = SITE_BY_CODE[code];
  return brandTexture(`sign:${code}`, 768, 200, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(4, 4, 760, 192, 24);
    ctx.fill();
    const logoW = drawLogo(ctx, 28, 22, 190, 156);
    const x = logoW ? 28 + logoW + 26 : 40;
    const maxW = 768 - x - 30;
    ctx.textBaseline = 'alphabetic';
    fitText(ctx, BRAND.name, x, 84, maxW, 700, 70, '#1D2B4F');
    fitText(ctx, BRAND.legal, x, 124, maxW, 500, 30, '#5B6478');
    fitText(ctx, `${code} · ${site.name}`, x, 172, maxW, 600, 36, '#2553E3');
  });
}

/** Fill text at the given size, shrinking it until it fits maxW. */
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, weight: number, size: number, color: string) {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (s > 12 && ctx.measureText(text).width > maxW) {
    s -= 1;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** Round roof decal on the depot (WH-01). */
export function roofLogo() {
  return brandTexture('roofLogo', 256, 256, (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();
    if (!drawLogo(ctx, 38, 38, 180, 180, true)) {
      ctx.fillStyle = '#1D2B4F';
      ctx.font = `800 64px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('MPM', 128, 134);
    }
  });
}

/** Repeating texture clone with its own repeat values (shares the image). */
export function repeated(base: THREE.Texture, rx: number, ry: number) {
  const t = base.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}

export const FONT = '"Inter", "Segoe UI", system-ui, sans-serif';

export function corrugated(base: string, line: string) {
  return canvasTexture(`corr:${base}:${line}`, 64, 64, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 64, 64);
    for (let x = 0; x < 64; x += 8) {
      const g = ctx.createLinearGradient(x, 0, x + 8, 0);
      g.addColorStop(0, line);
      g.addColorStop(0.35, base);
      g.addColorStop(1, base);
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 8, 64);
    }
  }, true);
}

export function roofRidges(base: string, line: string) {
  return canvasTexture(`roof:${base}:${line}`, 64, 64, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = line;
    for (let y = 0; y < 64; y += 8) ctx.fillRect(0, y, 64, 2);
  }, true);
}

export function windows() {
  return canvasTexture('windows', 128, 128, (ctx) => {
    ctx.fillStyle = '#F7F9FD';
    ctx.fillRect(0, 0, 128, 128);
    for (let y = 10; y < 128; y += 32) {
      for (let x = 8; x < 128; x += 30) {
        const g = ctx.createLinearGradient(x, y, x + 20, y + 18);
        g.addColorStop(0, '#6E95F2');
        g.addColorStop(1, '#3C68DC');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, 20, 16);
      }
    }
  }, true);
}

export function cardboard() {
  return canvasTexture('cardboard', 128, 128, (ctx) => {
    ctx.fillStyle = '#D9AE7A';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#B98C58';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 128; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 128);
      ctx.moveTo(0, i);
      ctx.lineTo(128, i);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(26, 0, 12, 128);
    ctx.fillRect(90, 0, 12, 128);
  });
}

export function stripes(a: string, b: string) {
  return canvasTexture(`stripes:${a}:${b}`, 128, 16, (ctx) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? a : b;
      ctx.fillRect(i * 16, 0, 16, 16);
    }
  });
}

function drawCube(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color = '#2553E3') {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.87, -s / 2);
  ctx.lineTo(s * 0.87, s / 2);
  ctx.lineTo(0, s);
  ctx.lineTo(-s * 0.87, s / 2);
  ctx.lineTo(-s * 0.87, -s / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.87, -s / 2);
  ctx.lineTo(0, 0);
  ctx.lineTo(-s * 0.87, -s / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The "LEARNING CENTER" lettering and red chevron on the WH-06 kantin's maroon wall. Aspect 4 : 1. */
export function learningCenterSign() {
  return canvasTexture('learning-center', 512, 128, (ctx) => {
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 50px ${FONT}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('LEARNING', 24, 58);
    ctx.fillText('CENTER', 24, 116);
    const x = 24 + ctx.measureText('CENTER').width + 22;
    ctx.fillStyle = '#E2312B';
    ctx.beginPath();
    ctx.moveTo(x, 70);
    ctx.lineTo(x + 26, 70);
    ctx.lineTo(x + 50, 93);
    ctx.lineTo(x + 26, 116);
    ctx.lineTo(x, 116);
    ctx.lineTo(x + 24, 93);
    ctx.closePath();
    ctx.fill();
  });
}

export function plate(text: string) {
  return canvasTexture(`plate:${text}`, 128, 64, (ctx) => {
    ctx.fillStyle = '#2553E3';
    ctx.beginPath();
    ctx.roundRect(0, 0, 128, 64, 10);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 30px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 34);
  });
}

/** Trailer side livery: carrier logo mark and name. */
export function livery(id: CarrierId) {
  const c = CARRIERS[id];
  return canvasTexture(`livery:${id}`, 512, 160, (ctx) => {
    ctx.clearRect(0, 0, 512, 160);
    const col = c.color;
    if (id === 'waretrack') {
      drawCube(ctx, 70, 78, 34, col);
      ctx.fillStyle = col;
      ctx.font = `800 64px ${FONT}`;
      ctx.fillText('WareTrack', 120, 100);
      ctx.font = `500 22px ${FONT}`;
      ctx.fillText('Delivering on time, every time', 124, 134);
    } else if (id === 'nordline') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(30, 110);
      ctx.lineTo(62, 52);
      ctx.lineTo(80, 82);
      ctx.lineTo(92, 64);
      ctx.lineTo(122, 110);
      ctx.closePath();
      ctx.fill();
      ctx.font = `800 62px ${FONT}`;
      ctx.fillText('Nordline', 136, 104);
      ctx.font = `500 22px ${FONT}`;
      ctx.fillText('Northbound freight', 140, 136);
    } else if (id === 'cargoviva') {
      ctx.fillStyle = col;
      for (let i = 0; i < 3; i++) ctx.fillRect(34, 56 + i * 18, 60 - i * 12, 10);
      ctx.font = `800 60px ${FONT}`;
      ctx.fillText('Cargoviva', 110, 102);
    } else {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(26, 112);
      ctx.lineTo(60, 50);
      ctx.lineTo(80, 80);
      ctx.lineTo(96, 58);
      ctx.lineTo(126, 112);
      ctx.closePath();
      ctx.fill();
      ctx.font = `800 62px ${FONT}`;
      ctx.fillText('Bluepeak', 138, 100);
      ctx.font = `500 22px ${FONT}`;
      ctx.fillText('Fresh from the peak', 142, 132);
    }
  });
}

export function radialGlow(color: string) {
  return canvasTexture(`glow:${color}`, 128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}

export function chevron() {
  return canvasTexture('chevron', 64, 64, (ctx) => {
    ctx.clearRect(0, 0, 64, 64);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(22, 14);
    ctx.lineTo(42, 32);
    ctx.lineTo(22, 50);
    ctx.stroke();
  });
}
