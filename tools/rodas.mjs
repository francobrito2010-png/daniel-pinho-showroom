// Pontos de apoio das rodas em cada imagem do showroom (para o "chão virtual" da página).
//
//   npm run rodas
//
// Para cada imagem de cars.js ("imagem" e "frames") encontra onde os pneus tocam no chão e grava
// em cars.js: "rodas": { "cars/x.webp": [[x, y], [x, y]] } (0–1, relativos à imagem; esquerda, direita).
// A página usa estes pontos para pôr a plataforma por baixo das rodas.
// Gera .work/rodas.png com os pontos marcados, para conferir. Correções manuais: "_rodas" em galerias.json.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {ROOT, WORK, lerStock, gravarStock} from './lib.mjs';

const gal = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'galerias.json'), 'utf8'));
const manual = gal._rodas || {};

// Perfil de baixo: para cada coluna, a linha opaca mais baixa (suavizada).
function perfil(alpha, w, h){
  const raw = new Int32Array(w).fill(-1);
  for (let x = 0; x < w; x++) for (let y = h - 1; y >= 0; y--) if (alpha[y * w + x] > 160) { raw[x] = y; break; }
  const xs = []; for (let x = 0; x < w; x++) if (raw[x] >= 0) xs.push(x);
  const x0 = xs[0], x1 = xs.at(-1), L = x1 - x0;
  const f = new Float32Array(w).fill(-1), r = Math.max(2, Math.round(L / 200));
  for (let x = x0; x <= x1; x++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const v = raw[x + k]; if (v >= 0) { s += v; n++; } } f[x] = n ? s / n : -1; }
  return {f, x0, x1, L};
}
const arg = (p, a, b, best) => { let bx = -1; for (let x = Math.round(Math.max(p.x0, a)); x <= Math.min(p.x1, b); x++) if (p.f[x] >= 0 && (bx < 0 || best(p.f[x], p.f[bx]))) bx = x; return bx; };
const lowest = (p, a, b) => arg(p, a, b, (v, c) => v > c), highest = (p, a, b) => arg(p, a, b, (v, c) => v < c);

// Vista 3/4: roda traseira na ponta, embaladeira (ponto mais alto entre rodas), roda da frente antes dela.
function tresQuartos(p){
  const {x0, x1, L} = p;
  const lado = dir => {
    const R = dir > 0 ? lowest(p, x1 - .14 * L, x1) : lowest(p, x0, x0 + .14 * L);
    const S = dir > 0 ? highest(p, R - .5 * L, R - .06 * L) : highest(p, R + .06 * L, R + .5 * L);
    const F = dir > 0 ? lowest(p, S - .3 * L, S) : lowest(p, S, S + .3 * L);
    return {pts: [F, R], salto: p.f[F] - p.f[S]};
  };
  const d = lado(1), e = lado(-1);
  return (d.salto >= e.salto ? d : e).pts;
}
// Vista de frente: os dois pneus da frente, um em cada ponta.
const frente = p => [lowest(p, p.x0, p.x0 + .3 * p.L), lowest(p, p.x1 - .3 * p.L, p.x1)];

const stock = lerStock();
const marcadas = [];
for (const car of stock.filter(c => c.showroom && c.imagem)) {
  car.rodas = {};
  for (const img of [...new Set([car.imagem, ...(car.frames || [])])]) {
    const file = path.join(ROOT, img);
    const {data: alpha, info} = await sharp(file).ensureAlpha().extractChannel(3).raw().toBuffer({resolveWithObject: true});
    const {width: w, height: h} = info;
    let pts;
    if (manual[img]) pts = manual[img].map(([x, y]) => [x * w, y * h]);
    else {
      const p = perfil(alpha, w, h);
      // a vista de frente é estreita (cabe numa tela larga); a 3/4 ocupa a largura toda
      const xs = (frente(p).every(x => x >= 0) && p.L / w < .75 ? frente(p) : tresQuartos(p));
      pts = xs.map(x => [x, p.f[x]]);
    }
    pts.sort((a, b) => a[0] - b[0]);
    car.rodas[img] = pts.map(([x, y]) => [+(x / w).toFixed(4), +(y / h).toFixed(4)]);
    const R = Math.round(w / 70), S = Math.max(2, Math.round(w / 350));
    const svg = `<svg width="${w}" height="${h}"><g fill="none" stroke="#e0115f" stroke-width="${S}">${pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${R}"/>`).join('')}<line x1="${pts[0][0]}" y1="${pts[0][1]}" x2="${pts[1][0]}" y2="${pts[1][1]}"/></g></svg>`;
    marcadas.push({img, buf: await sharp(file).composite([{input: Buffer.from(svg)}]).png().toBuffer()});
  }
  console.log(`✔ ${car.marca} ${car.modelo}: ${Object.keys(car.rodas).length} imagens`);
}
gravarStock(stock);

// folha de conferência
const W = 450, H = 260, cols = 4, rows = Math.ceil(marcadas.length / cols);
const tiles = await Promise.all(marcadas.map(async (m, i) => ({input: await sharp(m.buf).resize(W - 20, H - 30, {fit: 'contain', position: 'bottom', background: '#ffffff'}).png().toBuffer(), left: (i % cols) * W + 10, top: Math.floor(i / cols) * H + 5})));
const lbl = marcadas.map((m, i) => `<text x="${(i % cols) * W + 12}" y="${Math.floor(i / cols) * H + H - 8}" font-size="13" font-family="sans-serif" fill="#19644D">${m.img.replace('cars/', '')}</text>`).join('');
tiles.push({input: Buffer.from(`<svg width="${W * cols}" height="${H * rows}">${lbl}</svg>`), left: 0, top: 0});
await sharp({create: {width: W * cols, height: H * rows, channels: 3, background: '#ffffff'}}).composite(tiles).png().toFile(path.join(WORK, 'rodas.png'));
console.log('cars.js atualizado · conferir em tools/.work/rodas.png');
