// Ruído determinístico (value noise + fbm) e RNG semeado — mesmo mundo a cada render.
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
export function hash3(x, y, z) { return hash2(x + Math.imul(z | 0, 912367), y - Math.imul(z | 0, 3511)); }
const fade = t => t * t * (3 - 2 * t);
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = fade(x - xi), yf = fade(y - yi);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return (a + (b - a) * xf) + ((c + (d - c) * xf) - (a + (b - a) * xf)) * yf; // 0..1
}
export function fbm(x, y, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * (vnoise(x * f + i * 17.3, y * f - i * 9.1) * 2 - 1); n += a; a *= 0.5; f *= 2.03; }
  return s / n; // ~ -1..1
}
export function ridged(x, y, oct = 5) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { const v = 1 - Math.abs(vnoise(x * f + i * 31.7, y * f + i * 7.7) * 2 - 1); s += a * v * v; n += a; a *= 0.5; f *= 2.1; }
  return s / n; // 0..1
}
export function vnoise3(x, y, z) {
  const zi = Math.floor(z), zf = fade(z - zi);
  const a = vnoise(x + zi * 13.1, y - zi * 7.3), b = vnoise(x + (zi + 1) * 13.1, y - (zi + 1) * 7.3);
  return a + (b - a) * zf;
}
export const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
