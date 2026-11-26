import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 *  Texturas 100% procedurais.
 *  Nada e baixado: tudo e gerado em canvas no inicio do jogo.
 *  Cada superficie recebe cor + normal + rugosidade para que a lanterna
 *  "encontre" relevo, umidade e poeira de verdade.
 * ------------------------------------------------------------------ */

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y, seed) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function smooth(t) { return t * t * (3 - 2 * t); }

export function valueNoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = smooth(xf), v = smooth(yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  const top = a + (b - a) * u;
  const bot = c + (d - c) * u;
  return top + (bot - top) * v;
}

export function fbm(x, y, seed, octaves = 4, lacunarity = 2, gain = 0.5) {
  let sum = 0, amp = 0.5, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x, y, seed + i * 101) * amp;
    norm += amp;
    x *= lacunarity; y *= lacunarity; amp *= gain;
  }
  return sum / norm;
}

const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
function smoothstep(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function toTexture(canvas, { repeat = [1, 1], srgb = false, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Converte um canvas de altura em um normal map (Sobel simples). */
function normalFromHeight(heightCanvas, strength = 2.5) {
  const size = heightCanvas.width;
  const src = heightCanvas.getContext('2d').getImageData(0, 0, size, size).data;
  const out = makeCanvas(size);
  const octx = out.getContext('2d');
  const img = octx.createImageData(size, size);
  const lum = (x, y) => {
    const xx = (x + size) % size, yy = (y + size) % size;
    return src[(yy * size + xx) * 4] / 255;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (lum(x + 1, y) - lum(x - 1, y)) * strength;
      const dy = (lum(x, y + 1) - lum(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

function jaggedCrack(ctx, size, seed, count, color, minW = 0.6, maxW = 1.8) {
  const r = rng(seed);
  for (let c = 0; c < count; c++) {
    let x = r() * size, y = r() * size;
    let angle = r() * Math.PI * 2;
    const steps = 8 + Math.floor(r() * 20);
    const len = size * (0.04 + r() * 0.16);
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let i = 0; i < steps; i++) {
      angle += (r() - 0.5) * 0.9;
      x += Math.cos(angle) * len / steps;
      y += Math.sin(angle) * len / steps;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = minW + r() * (maxW - minW);
    ctx.lineCap = 'round';
    ctx.stroke();
    // ramificação
    if (r() > 0.55) {
      ctx.beginPath(); ctx.moveTo(x, y);
      let a2 = angle + (r() - 0.5) * 1.6;
      for (let i = 0; i < 5; i++) {
        a2 += (r() - 0.5) * 0.7;
        x += Math.cos(a2) * len / 10; y += Math.sin(a2) * len / 10;
        ctx.lineTo(x, y);
      }
      ctx.lineWidth = minW * 0.7; ctx.stroke();
    }
  }
}

function waterStreaks(ctx, size, seed, count) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = r() * size, w = 2 + r() * 22;
    const top = r() * size * 0.6, len = size * (0.12 + r() * 0.5);
    const g = ctx.createLinearGradient(0, top, 0, top + len);
    g.addColorStop(0, 'rgba(18,22,16,0)');
    g.addColorStop(0.25, `rgba(16,21,15,${0.04 + r() * 0.13})`);
    g.addColorStop(1, 'rgba(10,14,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, top, w, len);
  }
}

function blotches(ctx, size, seed, count, color, bottomBias = true) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = r() * size;
    const y = bottomBias ? size * (0.35 + r() * 0.7) : r() * size;
    const rad = size * (0.03 + r() * 0.17);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rad, rad * (0.5 + r()), r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function concreteWall(size = 512, seed = 11) {
  const color = makeCanvas(size), height = makeCanvas(size), rough = makeCanvas(size);
  const cc = color.getContext('2d'), hc = height.getContext('2d'), rc = rough.getContext('2d');
  const ci = cc.createImageData(size, size), hi = hc.createImageData(size, size), ri = rc.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const n = fbm(u * 7, v * 6, seed, 4);
      const fine = fbm(u * 62, v * 62, seed + 3, 2);
      const stain = fbm(u * 2.6, v * 3.1, seed + 9, 3);
      const damp = clamp01(smoothstep(0.47, 0.72, stain) * (0.22 + 0.78 * v)
        + 0.3 * smoothstep(0.62, 0.86, fbm(u * 5, v * 2, seed + 31, 2)) * v);
      const tone = 0.63 + (n - 0.5) * 0.46 + (fine - 0.5) * 0.16 - damp * 0.3;
      const i = (y * size + x) * 4;
      ci.data[i] = 154 * tone * (1 - damp * 0.2);
      ci.data[i + 1] = 151 * tone * (1 - damp * 0.03);
      ci.data[i + 2] = 137 * tone * (1 - damp * 0.25);
      ci.data[i + 3] = 255;
      const h = clamp01(0.5 + (n - 0.5) * 0.55 + (fine - 0.5) * 0.4 - damp * 0.08);
      hi.data[i] = hi.data[i + 1] = hi.data[i + 2] = h * 255; hi.data[i + 3] = 255;
      const ro = clamp01(0.86 + (fine - 0.5) * 0.16 - damp * 0.44);
      ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = ro * 255; ri.data[i + 3] = 255;
    }
  }
  cc.putImageData(ci, 0, 0); hc.putImageData(hi, 0, 0); rc.putImageData(ri, 0, 0);

  waterStreaks(cc, size, seed + 100, 46);
  waterStreaks(hc, size, seed + 100, 30);
  blotches(cc, size, seed + 200, 14, 'rgba(24,32,22,0.30)');
  blotches(cc, size, seed + 201, 8, 'rgba(62,48,30,0.16)', false);
  jaggedCrack(cc, size, seed + 300, 7, 'rgba(18,20,17,0.55)');
  jaggedCrack(hc, size, seed + 300, 7, 'rgba(8,8,8,0.55)');

  // Tinta descascando em algumas placas
  const r = rng(seed + 400);
  for (let i = 0; i < 5; i++) {
    const x = r() * size, y = r() * size * 0.8, w = 30 + r() * 90, h = 25 + r() * 70;
    cc.save(); cc.translate(x, y); cc.rotate((r() - 0.5) * 0.5);
    cc.fillStyle = 'rgba(96,94,78,0.45)';
    cc.beginPath();
    for (let p = 0; p <= 10; p++) {
      const px = (p / 10) * w, py = Math.sin(p * 1.7 + i) * 5 + h * (0.3 + r() * 0.4);
      p ? cc.lineTo(px, py) : cc.moveTo(px, py);
    }
    cc.lineTo(w, 0); cc.lineTo(0, 0); cc.closePath(); cc.fill(); cc.restore();
  }

  return {
    map: toTexture(color, { repeat: [2, 1], srgb: true }),
    normalMap: toTexture(normalFromHeight(height, 2.6), { repeat: [2, 1] }),
    roughnessMap: toTexture(rough, { repeat: [2, 1] }),
  };
}

export function concreteFloor(size = 512, seed = 23) {
  const color = makeCanvas(size), height = makeCanvas(size), rough = makeCanvas(size);
  const cc = color.getContext('2d'), hc = height.getContext('2d'), rc = rough.getContext('2d');
  const ci = cc.createImageData(size, size), hi = hc.createImageData(size, size), ri = rc.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const n = fbm(u * 9, v * 9, seed, 4);
      const grit = fbm(u * 90, v * 90, seed + 5, 2);
      const wet = smoothstep(0.58, 0.76, fbm(u * 2.5, v * 2.5, seed + 12, 3));
      const tone = 0.52 + (n - 0.5) * 0.42 + (grit - 0.5) * 0.24 - wet * 0.26;
      const i = (y * size + x) * 4;
      ci.data[i] = 128 * tone; ci.data[i + 1] = 124 * tone; ci.data[i + 2] = 110 * tone; ci.data[i + 3] = 255;
      const h = clamp01(0.5 + (n - 0.5) * 0.4 + (grit - 0.5) * 0.5);
      hi.data[i] = hi.data[i + 1] = hi.data[i + 2] = h * 255; hi.data[i + 3] = 255;
      const ro = clamp01(0.9 + (grit - 0.5) * 0.12 - wet * 0.5);
      ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = ro * 255; ri.data[i + 3] = 255;
    }
  }
  cc.putImageData(ci, 0, 0); hc.putImageData(hi, 0, 0); rc.putImageData(ri, 0, 0);
  jaggedCrack(cc, size, seed + 50, 10, 'rgba(14,15,13,0.5)', 0.7, 2.2);
  jaggedCrack(hc, size, seed + 50, 10, 'rgba(6,6,6,0.6)', 0.7, 2.2);
  blotches(cc, size, seed + 60, 12, 'rgba(26,30,24,0.24)', false);
  // pequenas pedras / cascalho
  const r = rng(seed + 70);
  for (let i = 0; i < 400; i++) {
    const x = r() * size, y = r() * size, rad = 0.4 + r() * 2.2;
    cc.fillStyle = `rgba(${90 + r() * 70 | 0},${88 + r() * 65 | 0},${76 + r() * 55 | 0},${0.2 + r() * 0.35})`;
    cc.beginPath(); cc.arc(x, y, rad, 0, Math.PI * 2); cc.fill();
  }
  return {
    map: toTexture(color, { repeat: [3, 3], srgb: true }),
    normalMap: toTexture(normalFromHeight(height, 2.2), { repeat: [3, 3] }),
    roughnessMap: toTexture(rough, { repeat: [3, 3] }),
  };
}

export function oldWood(size = 512, seed = 41) {
  const color = makeCanvas(size), height = makeCanvas(size), rough = makeCanvas(size);
  const cc = color.getContext('2d'), hc = height.getContext('2d'), rc = rough.getContext('2d');
  const ci = cc.createImageData(size, size), hi = hc.createImageData(size, size), ri = rc.createImageData(size, size);
  const planks = 4, ph = size / planks;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const grain = fbm(u * 3.2, y * 0.075, seed, 4, 2.1, 0.55);
      const fine = fbm(u * 20, y * 0.5, seed + 7, 2);
      const py = (y % ph) / ph;
      const seam = (py < 0.025 || py > 0.975) ? 0.42 : 1;
      const plankShade = 0.82 + ((Math.floor(y / ph) % 3) * 0.07);
      const tone = (0.42 + (grain - 0.5) * 0.6 + (fine - 0.5) * 0.14) * seam * plankShade;
      const i = (y * size + x) * 4;
      ci.data[i] = 112 * tone * 1.15; ci.data[i + 1] = 78 * tone * 1.1; ci.data[i + 2] = 48 * tone; ci.data[i + 3] = 255;
      const h = clamp01(0.5 + (grain - 0.5) * 0.7 + (fine - 0.5) * 0.25) * (seam < 1 ? 0.35 : 1);
      hi.data[i] = hi.data[i + 1] = hi.data[i + 2] = h * 255; hi.data[i + 3] = 255;
      const ro = clamp01(0.82 + (fine - 0.5) * 0.2);
      ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = ro * 255; ri.data[i + 3] = 255;
    }
  }
  cc.putImageData(ci, 0, 0); hc.putImageData(hi, 0, 0); rc.putImageData(ri, 0, 0);
  // nos e pregos
  const r = rng(seed + 90);
  for (let i = 0; i < 9; i++) {
    const x = r() * size, y = r() * size;
    for (let ring = 5; ring > 0; ring--) {
      cc.strokeStyle = `rgba(28,18,10,${0.06 + (5 - ring) * 0.025})`;
      cc.lineWidth = 1.2;
      cc.beginPath(); cc.ellipse(x, y, ring * 2.4, ring * 1.1, 0, 0, Math.PI * 2); cc.stroke();
    }
  }
  for (let p = 0; p < planks; p++) {
    for (const fx of [0.08, 0.92]) {
      cc.fillStyle = 'rgba(25,22,18,0.7)';
      cc.beginPath(); cc.arc(fx * size, (p + 0.5) * ph, 2.2, 0, Math.PI * 2); cc.fill();
    }
  }
  jaggedCrack(cc, size, seed + 110, 5, 'rgba(20,12,7,0.5)', 0.5, 1.2);
  return {
    map: toTexture(color, { srgb: true }),
    normalMap: toTexture(normalFromHeight(height, 2.0)),
    roughnessMap: toTexture(rough),
  };
}

export function rustyMetal(size = 256, seed = 77) {
  const color = makeCanvas(size), height = makeCanvas(size), rough = makeCanvas(size);
  const cc = color.getContext('2d'), hc = height.getContext('2d'), rc = rough.getContext('2d');
  const ci = cc.createImageData(size, size), hi = hc.createImageData(size, size), ri = rc.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const base = fbm(u * 5, v * 5, seed, 4);
      const rust = smoothstep(0.48, 0.68, fbm(u * 8, v * 8, seed + 4, 4));
      const pit = fbm(u * 60, v * 60, seed + 9, 2);
      const i = (y * size + x) * 4;
      const g = (54 + (base - 0.5) * 46) * (1 - rust * 0.25);
      ci.data[i] = g + rust * (96 + (pit - 0.5) * 50);
      ci.data[i + 1] = g * 1.03 + rust * (42 + (pit - 0.5) * 30);
      ci.data[i + 2] = g * 1.05 + rust * (19 + (pit - 0.5) * 20);
      ci.data[i + 3] = 255;
      const h = clamp01(0.5 + (base - 0.5) * 0.3 + (pit - 0.5) * 0.5 - rust * 0.18);
      hi.data[i] = hi.data[i + 1] = hi.data[i + 2] = h * 255; hi.data[i + 3] = 255;
      const ro = clamp01(0.45 + rust * 0.45 + (pit - 0.5) * 0.12);
      ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = ro * 255; ri.data[i + 3] = 255;
    }
  }
  cc.putImageData(ci, 0, 0); hc.putImageData(hi, 0, 0); rc.putImageData(ri, 0, 0);
  waterStreaks(cc, size, seed + 30, 22);
  blotches(cc, size, seed + 40, 9, 'rgba(120,55,18,0.3)', false);
  return {
    map: toTexture(color, { srgb: true }),
    normalMap: toTexture(normalFromHeight(height, 2.2)),
    roughnessMap: toTexture(rough),
  };
}

/** Teia de aranha com transparencia. */
export function cobweb(size = 256, seed = 5) {
  const c = makeCanvas(size), ctx = c.getContext('2d');
  const r = rng(seed), cx = size * 0.08, cy = size * 0.08;
  const spokes = 9;
  ctx.strokeStyle = 'rgba(215,220,205,0.42)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i <= spokes; i++) {
    const a = (i / spokes) * Math.PI * 0.52;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * size, cy + Math.sin(a) * size); ctx.stroke();
  }
  for (let ring = 1; ring < 12; ring++) {
    const rad = ring * size / 12;
    ctx.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const a = (i / spokes) * Math.PI * 0.52;
      const sag = rad * (0.035 + 0.02 * Math.sin(i * 2.3 + ring));
      const x = cx + Math.cos(a) * (rad + sag), y = cy + Math.sin(a) * (rad + sag);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = `rgba(220,225,210,${0.1 + r() * 0.2})`;
    ctx.stroke();
  }
  return toTexture(c, { srgb: true });
}

export function stainTexture(size = 256, seed = 61) {
  const c = makeCanvas(size), ctx = c.getContext('2d');
  const r = rng(seed);
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, dist = r() * size * 0.22;
    const x = size / 2 + Math.cos(a) * dist, y = size / 2 + Math.sin(a) * dist;
    const rad = size * (0.08 + r() * 0.18);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(18,22,15,${0.18 + r() * 0.3})`);
    g.addColorStop(1, 'rgba(18,22,15,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  }
  return toTexture(c, { srgb: true });
}

export function glowTexture(size = 128) {
  const c = makeCanvas(size), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,250,225,1)');
  g.addColorStop(0.18, 'rgba(255,245,205,0.7)');
  g.addColorStop(0.5, 'rgba(230,235,190,0.14)');
  g.addColorStop(1, 'rgba(200,220,180,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return toTexture(c, { srgb: true });
}

export function dustSprite(size = 64) {
  const c = makeCanvas(size), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,240,1)');
  g.addColorStop(0.35, 'rgba(255,255,235,0.45)');
  g.addColorStop(1, 'rgba(255,255,235,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return toTexture(c, { srgb: true });
}

export function beamTexture(size = 128) {
  const c = makeCanvas(size), ctx = c.getContext('2d');
  // gradiente ao longo do cone + sujeira transversal
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, 'rgba(255,248,210,0.55)');
  g.addColorStop(0.25, 'rgba(240,245,210,0.22)');
  g.addColorStop(1, 'rgba(210,225,190,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  const r = rng(3);
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(0,0,0,${r() * 0.16})`;
    ctx.fillRect(r() * size, r() * size, 1 + r() * 3, 2 + r() * 16);
  }
  return toTexture(c, { srgb: true });
}

/** "Cookie" da lanterna: hotspot macio e reflector sujo, projetado na cena. */
export function spotCookie(size = 128) {
  const c = makeCanvas(size), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(
    size / 2, size / 2, size * 0.035,
    size / 2, size / 2, size * 0.5
  );
  g.addColorStop(0, 'rgb(255,255,255)');
  g.addColorStop(0.32, 'rgb(246,246,246)');
  g.addColorStop(0.68, 'rgb(176,176,176)');
  g.addColorStop(1, 'rgb(24,24,24)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);

  // manchas fracas no vidro/reflector — quebram o círculo perfeito
  const r = rng(913);
  for (let i = 0; i < 22; i++) {
    const x = size * (0.2 + r() * 0.6), y = size * (0.2 + r() * 0.6);
    const rad = size * (0.04 + r() * 0.09);
    const smudge = ctx.createRadialGradient(x, y, 0, x, y, rad);
    smudge.addColorStop(0, `rgba(0,0,0,${0.04 + r() * 0.09})`);
    smudge.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = smudge; ctx.fillRect(0, 0, size, size);
  }
  const t = toTexture(c, { aniso: 1 });
  t.flipY = false;
  return t;
}

/** small=true no celular: metade da resolução, cache de textura bem mais leve. */
export function buildTextures(small = false) {
  const s = small ? 256 : 512;
  const m = small ? 128 : 256;
  return {
    wall: concreteWall(s),
    floor: concreteFloor(s),
    wood: oldWood(s),
    metal: rustyMetal(m),
    cobweb: cobweb(),
    stain: stainTexture(),
    glow: glowTexture(),
    dust: dustSprite(),
    beam: beamTexture(),
    cookie: spotCookie(small ? 64 : 128),
  };
}
