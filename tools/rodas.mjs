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
    // roda da frente: o primeiro "morro" do perfil a partir da embaladeira (não o ponto mais baixo,
    // que num desportivo com splitter baixo é o para-choques)
    const passo = -dir, lim = dir > 0 ? Math.max(p.x0, S - .35 * L) : Math.min(p.x1, S + .35 * L);
    const queda = Math.max(3, p.L * .006);
    let F = S;
    for (let x = S; dir > 0 ? x >= lim : x <= lim; x += passo) {
      if (p.f[x] < 0) continue;
      if (p.f[x] > p.f[F]) F = x;
      else if (p.f[F] - p.f[x] > queda && p.f[F] - p.f[S] > queda) break;   // voltou a subir: o pneu acabou
    }
    return {pts: [F, R], salto: p.f[F] - p.f[S]};
  };
  const d = lado(1), e = lado(-1);
  return (d.salto >= e.salto ? d : e).pts;
}
// Vista de frente: os dois pneus da frente, um em cada ponta.
const frente = p => [lowest(p, p.x0, p.x0 + .3 * p.L), lowest(p, p.x1 - .3 * p.L, p.x1)];

// Base oval sob o carro, a partir do contorno de baixo (para-choques da frente → traseira):
// alinhada com a inclinação desse contorno, sobra um pouco à frente e atrás, e pouco pelos lados.
const BASE = {
  sobra: .08,    // quanto o oval passa da frente e da traseira (× comprimento do carro no ecrã)
  altura: .085,  // semi-altura do oval (× comprimento) — estreito: pouco pelas portas
  subir: .35,    // o centro sobe esta fração da semi-altura acima da linha do contorno (fica por baixo do carro)
  alturaFrente: .13, subirFrente: .55,   // vista de frente: oval mais fundo, assente nos pneus
};
// Vista 3/4 (medido nos traços do Franco sobre 4 carros, em frações do comprimento do carro no ecrã):
// a ponta da frente fica um pouco fora e abaixo do para-choques; a de trás contorna a roda traseira
// e sobe até à altura do topo dela; o oval desce bem por baixo da roda da frente; forma de ovo.
const OVO = {
  frente: [.04, .07],    // ponta da frente: para fora e para baixo do canto inferior do para-choques
  tras: [.12, -.09],     // ponta de trás: para fora e para cima do apoio da roda traseira
  altura: .17,           // semi-altura do oval
};
function ovo(p, F, R){
  const s = R[0] > F[0] ? 1 : -1;                        // 1: frente à esquerda
  const xb = s > 0 ? lowest(p, p.x0, p.x0 + .05 * p.L) : lowest(p, p.x1 - .05 * p.L, p.x1);
  const L = p.L;
  const tF = [xb - s * OVO.frente[0] * L, p.f[xb] + OVO.frente[1] * L];
  const tR = [R[0] + s * OVO.tras[0] * L, R[1] + OVO.tras[1] * L];
  const th = Math.atan2(tR[1] - tF[1], tR[0] - tF[0]);  // eixo local: da frente para trás (frente = lado esquerdo do elemento)
  return {cx: (tF[0] + tR[0]) / 2, cy: (tF[1] + tR[1]) / 2, A: Math.hypot(tR[0] - tF[0], tR[1] - tF[1]) / 2, B: OVO.altura * L, th: th * 180 / Math.PI, ovo: 1};
}
function oval(p, deFrente){
  const pts = [];
  for (let x = p.x0; x <= p.x1; x += Math.max(1, Math.round(p.L / 120))) if (p.f[x] >= 0) pts.push([x, p.f[x]]);
  // reta que melhor segue o contorno (mínimos quadrados) → inclinação do oval
  const n = pts.length, mx = pts.reduce((s, q) => s + q[0], 0) / n, my = pts.reduce((s, q) => s + q[1], 0) / n;
  let sxy = 0, sxx = 0; for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; }
  const th = Math.atan(sxy / sxx), c = Math.cos(th), s = Math.sin(th);
  const uv = pts.map(([x, y]) => [(x - mx) * c + (y - my) * s, -(x - mx) * s + (y - my) * c]);   // u ao longo, v para baixo
  const u0 = Math.min(...uv.map(q => q[0])), u1 = Math.max(...uv.map(q => q[0])), len = u1 - u0;
  const A = len / 2 * (1 + 2 * BASE.sobra), uc = (u0 + u1) / 2;
  // o oval assenta na linha do contorno (rodas e para-choques) e sobe um pouco para debaixo do carro
  let B = BASE.altura * len, vc = -BASE.subir * B;
  if (deFrente) {
    // de frente: o para-choques fica acima dos pneus; o oval assenta nos pneus (pontos mais baixos)
    // e estende-se para trás, por baixo do carro
    const vmax = Math.max(...uv.map(q => q[1]));
    B = BASE.alturaFrente * len; vc = vmax - BASE.subirFrente * B;
  }
  const cx = mx + uc * c - vc * s, cy = my + uc * s + vc * c;
  return {cx, cy, A, B, th: th * 180 / Math.PI};
}

const stock = lerStock();
const marcadas = [];
for (const car of stock.filter(c => c.showroom && c.imagem)) {
  car.rodas = {}; car.base = {};
  for (const img of [...new Set([car.imagem, ...(car.frames || [])])]) {
    const file = path.join(ROOT, img);
    const {data: alpha, info} = await sharp(file).ensureAlpha().extractChannel(3).raw().toBuffer({resolveWithObject: true});
    const {width: w, height: h} = info;
    const pf = perfil(alpha, w, h);
    // a vista de frente é estreita (cabe numa tela larga); a 3/4 ocupa a largura toda
    const deFrente = frente(pf).every(x => x >= 0) && pf.L / w < .75;
    let pts, F, Rr;
    if (manual[img]) pts = manual[img].map(([x, y]) => [x * w, y * h]);
    else pts = (deFrente ? frente(pf) : tresQuartos(pf)).map(x => [x, pf.f[x]]);
    if (!deFrente) [F, Rr] = pts[0][1] > pts[1][1] ? [pts[0], pts[1]] : [pts[1], pts[0]];   // a da frente é a mais baixa
    const o = deFrente ? oval(pf, true) : ovo(pf, F, Rr);
    // base: [cx, cy, A, B] divididos pela largura da imagem (escala uniforme), rotação em graus, forma (1 = ovo)
    car.base[img] = [o.cx / w, o.cy / w, o.A / w, o.B / w].map(v => +v.toFixed(4)).concat(+o.th.toFixed(2), o.ovo || 0);
    pts.sort((a, b) => a[0] - b[0]);
    car.rodas[img] = pts.map(([x, y]) => [+(x / w).toFixed(4), +(y / h).toFixed(4)]);
    const R = Math.round(w / 70), S = Math.max(2, Math.round(w / 350));
    // conferência: a base oval (verde) por baixo do carro + os pontos das rodas (rosa)
    const padY = Math.round(o.B * 1.6), H2 = h + padY;
    const base = `<svg width="${w}" height="${H2}"><ellipse cx="${o.cx}" cy="${o.cy}" rx="${o.A}" ry="${o.B}" transform="rotate(${o.th} ${o.cx} ${o.cy})" fill="#e3ece7" stroke="#19644D" stroke-width="${S}"/></svg>`;
    const marcas = `<svg width="${w}" height="${H2}"><g fill="none" stroke="#e0115f" stroke-width="${S}">${pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${R}"/>`).join('')}</g></svg>`;
    marcadas.push({img, buf: await sharp({create: {width: w, height: H2, channels: 4, background: '#ffffff'}})
      .composite([{input: Buffer.from(base)}, {input: file, left: 0, top: 0}, {input: Buffer.from(marcas)}]).png().toBuffer()});
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
