// Plataforma redonda (disco em perspetiva) por baixo de cada carro do showroom.
//
//   npm run disco                 (todos os carros do showroom)
//   node disco.mjs 1722938 …      (só estes; os outros ficam sem disco e com o chão em trapézio)
//
// Para cada imagem de cars.js ("imagem" e "frames") lê o perfil de baixo do recorte, encontra os pontos
// de apoio (máximos locais: pneus e ponto mais baixo) e calcula a elipse mais achatada que assenta o carro todo,
// incluindo a traseira: em vista 3/4 a roda traseira fica mais alta na foto, por isso o disco sobe por trás dela.
// Grava em cars.js: "disco": { "cars/x.webp": [cx, cy, rx, ry] } (0–1, relativos à largura/altura da imagem).
// Gera .work/disco.png com as elipses desenhadas, para conferir.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {ROOT, WORK, lerStock, gravarStock} from './lib.mjs';

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

// Pontos de apoio: máximos locais do perfil (numa janela de 4% da largura do carro), sem as pontas finas.
function apoios(p){
  const jan = Math.round(p.L * .04), pts = [];
  for (let x = p.x0 + Math.round(p.L * .02); x <= p.x1 - Math.round(p.L * .02); x++) {
    if (p.f[x] < 0) continue;
    let max = true;
    for (let k = -jan; k <= jan && max; k++) if (k && p.f[x + k] > p.f[x]) max = false;
    if (max && (!pts.length || x - pts.at(-1)[0] > jan)) pts.push([x, p.f[x]]);
  }
  return pts;
}

// Elipse com as proporções da referência (imagem do ChatGPT): largura 1,66× o carro, achatamento ~0,14,
// pneus ~11% da altura do carro para dentro da borda e a carroçaria (traseira, splitter) com ~8% de folga.
// Critério visual: em nenhuma coluna pode haver fundo à vista entre o carro e o disco (senão a traseira "flutua").
// Procura o ry mais pequeno (disco mais achatado) que cumpre isso, deixando o centro deslizar um pouco
// para a frente ou para trás do centro do carro; entre centros possíveis fica o que deixa mais folga.
function elipse(p, pts, h){
  const rx = p.L * .83, c0 = (p.x0 + p.x1) / 2;
  const padPneu = h * .11, padCorpo = h * .08;
  // carroçaria junto ao chão (sem saliências altas como os espelhos na vista de frente)
  const passo = Math.max(1, Math.round(p.L / 240)), corpo = [], fundo = Math.max(...pts.map(q => q[1]));
  for (let x = p.x0 + Math.round(p.L * .015); x <= p.x1 - Math.round(p.L * .015); x += passo) if (p.f[x] >= 0 && p.f[x] > fundo - h * .45) corpo.push([x, p.f[x]]);
  const limites = cx => (ry) => {
    let L = -Infinity, U = Infinity;
    const conta = (x, y, pad) => { const t = (x - cx) / rx, hh = ry * Math.sqrt(Math.max(0, 1 - t * t)); U = Math.min(U, y - pad + hh); L = Math.max(L, y + pad - hh); };
    for (const [x, y] of corpo) conta(x, y, padCorpo);
    for (const [x, y] of pts) conta(x, y, padPneu);
    return {L, U};
  };
  for (let ry = rx * .12; ry < rx * .6; ry += .5) {
    let melhor = null;
    for (let d = -.06; d <= .0601; d += .01) {
      const cx = c0 + d * p.L, {L, U} = limites(cx)(ry);
      if (L <= U && (!melhor || U - L > melhor.folga)) melhor = {cx, cy: (L + U) / 2, folga: U - L};
    }
    if (melhor) return {cx: melhor.cx, cy: melhor.cy, rx, ry};
  }
  return {cx: c0, cy: Math.max(...pts.map(q => q[1])), rx, ry: rx * .6};
}

const SO = process.argv.slice(2);
const stock = lerStock();
const prova = [];
for (const car of stock.filter(c => c.showroom)) {
  if (SO.length && !SO.includes(car.id)) { delete car.disco; continue; }
  car.disco = {};
  for (const src of [...new Set([car.imagem, ...(car.frames || [])])]) {
    const {data, info} = await sharp(path.join(ROOT, src)).ensureAlpha().extractChannel(3).raw().toBuffer({resolveWithObject: true});
    const p = perfil(data, info.width, info.height), pts = apoios(p), e = elipse(p, pts, info.height);
    const r4 = v => Math.round(v * 1e4) / 1e4;
    car.disco[src] = [r4(e.cx / info.width), r4(e.cy / info.height), r4(e.rx / info.width), r4(e.ry / info.height)];
    prova.push({src, w: info.width, h: info.height, e, pts});
    console.log(src.padEnd(44), pts.length, 'apoios →', car.disco[src].join(', '));
  }
}
gravarStock(stock);

// folha de conferência: cada imagem com a elipse e os apoios
const CW = 520, rows = [];
for (const q of prova) {
  const k = CW / q.w, H = Math.round(q.h * k) + 120, top = 40;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${H}">
    <ellipse cx="${q.e.cx * k}" cy="${q.e.cy * k + top}" rx="${q.e.rx * k}" ry="${q.e.ry * k}" fill="rgba(200,22,29,.55)"/>
    ${q.pts.map(([x, y]) => `<circle cx="${x * k}" cy="${y * k + top}" r="4" fill="#0a0"/>`).join('')}
    <text x="6" y="16" font-size="12" font-family="sans-serif">${q.src}</text></svg>`;
  const carro = await sharp(path.join(ROOT, q.src)).resize(CW).toBuffer();
  rows.push(await sharp({create: {width: CW + 160, height: H, channels: 4, background: '#f1efeb'}})
    .composite([{input: Buffer.from(svg), left: 80, top: 0}, {input: carro, left: 80, top}, {input: Buffer.from(svg.replace(/<ellipse[^>]*\/>/, '')), left: 80, top: 0}]).png().toBuffer());
}
const cols = 4, cw = CW + 160, rh = Math.max(...await Promise.all(rows.map(async b => (await sharp(b).metadata()).height)));
await sharp({create: {width: cw * cols, height: rh * Math.ceil(rows.length / cols), channels: 4, background: '#ffffff'}})
  .composite(rows.map((b, i) => ({input: b, left: (i % cols) * cw, top: Math.floor(i / cols) * rh}))).png().toFile(path.join(WORK, 'disco.png'));
console.log('ok → .work/disco.png');
