// Recorte automático da imagem principal dos carros do showroom.
//
//   npm run recortar -- 1722938 1717736      (ids de cars.js)
//   npm run recortar -- --todos              (todos os carros com "showroom" e sem rotação)
//   npm run recortar -- 1726224 --foto 1     (usar a 2.ª foto do anúncio)
//   npm run recortar -- 1722938 --nivel 0.3  (nivelar as rodas: 0 = ângulo original, padrão; deforma o carro)
//   npm run recortar -- 1722938 --variantes  (folha para comparar: rodas detetadas | 50 % | 100 %)
//
// Passos: foto original 2100 px → máscara BiRefNet → limpeza (só o carro) → recorte rente → WebP.
// Os carros com rotação (campo "frames") são feitos por girar.mjs.
import path from 'node:path';
import sharp from 'sharp';
import {ROOT, WORK, TRANSP, die, lerStock, baixar, original, recortar, webp, folha} from './lib.mjs';

const MAX_W = 1800;             // largura máxima do WebP final

// ---------- argumentos ----------
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : def; };
const fotoIdx = +opt('--foto', 0);
const nivel = +opt('--nivel', 0);
const todos = args.includes('--todos');
const variantes = args.includes('--variantes');
const ids = args.filter(a => !a.startsWith('--'));

const stock = lerStock();
const alvo = todos ? stock.filter(c => c.showroom && c.imagem && !(c.frames && c.frames.length))
                   : ids.map(id => stock.find(c => c.id === id) || die(`id ${id} não existe em cars.js`));
if (!alvo.length) die('Indique ids de cars.js ou --todos');

// ---------- nivelar (opcional): os pontos de contacto das rodas à mesma altura ----------
// Perfil de baixo do carro (linha mais baixa opaca em cada coluna). Nas fotos 3/4 frente:
//   roda traseira = ponto mais baixo na ponta do lado da traseira;
//   embaladeira   = ponto mais alto do perfil entre as rodas;
//   roda da frente = ponto mais baixo logo antes da embaladeira.
function contactos(alpha, w, h){
  const raw = new Int32Array(w).fill(-1);
  for (let x = 0; x < w; x++) for (let y = h - 1; y >= 0; y--) if (alpha[y * w + x] > 160) { raw[x] = y; break; }
  const xs = []; for (let x = 0; x < w; x++) if (raw[x] >= 0) xs.push(x);
  const x0 = xs[0], x1 = xs.at(-1), L = x1 - x0;
  const fundo = new Float32Array(w);
  const r = Math.max(2, Math.round(L / 200));
  for (let x = x0; x <= x1; x++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const v = raw[x + k]; if (v >= 0) { s += v; n++; } } fundo[x] = n ? s / n : -1; }
  const arg = (a, b, best) => { let bx = -1; for (let x = Math.round(Math.max(x0, a)); x <= Math.min(x1, b); x++) if (bx < 0 || best(fundo[x], fundo[bx])) bx = x; return bx; };
  const lowest = (a, b) => arg(a, b, (v, cur) => v > cur), highest = (a, b) => arg(a, b, (v, cur) => v < cur);
  const lado = (dir) => {
    const R = dir > 0 ? lowest(x1 - .14 * L, x1) : lowest(x0, x0 + .14 * L);
    const S = dir > 0 ? highest(R - .5 * L, R - .06 * L) : highest(R + .06 * L, R + .5 * L);
    const F = dir > 0 ? lowest(S - .3 * L, S) : lowest(S, S + .3 * L);
    return {R, S, F, salto: fundo[F] - fundo[S]};
  };
  const d = lado(1), e = lado(-1), c = d.salto >= e.salto ? d : e;
  return [[c.F, Math.round(fundo[c.F])], [c.R, Math.round(fundo[c.R])]].sort((a, b) => a[0] - b[0]);
}

// ---------- pipeline ----------
const feitos = [];
for (const car of alvo) {
  const t0 = Date.now();
  const nome = path.basename(car.imagem);
  const src = await baixar(original(car.fotos[fotoIdx]), `${car.id}-${fotoIdx}`);
  const {rgba, alpha, w, h} = await recortar(src);
  const [[xa, ya], [xb, yb]] = contactos(alpha, w, h);
  const base = sharp(rgba, {raw: {width: w, height: h, channels: 4}});
  const nivelar = async t => {                          // inclinação vertical: y' = y + k·x (as verticais ficam direitas)
    const k = t * (ya - yb) / (xb - xa);
    const img = Math.abs(k) > 0.002 ? sharp(await base.clone().affine([1, 0, k, 1], {background: TRANSP, interpolator: 'bicubic'}).png().toBuffer()) : base.clone();
    return {k, png: await img.trim({background: TRANSP, threshold: 1}).png().toBuffer()};
  };
  if (variantes) {                                      // folha: [rodas detetadas | 50 % | 100 %]
    const R = Math.round(w / 60), S = Math.round(w / 300);
    const marca = `<svg width="${w}" height="${h}"><g fill="none" stroke="#ff3b3b" stroke-width="${S}"><circle cx="${xa}" cy="${ya}" r="${R}"/><circle cx="${xb}" cy="${yb}" r="${R}"/><line x1="${xa}" y1="${ya}" x2="${xb}" y2="${yb}"/></g></svg>`;
    const vs = [await base.clone().composite([{input: Buffer.from(marca)}]).png().toBuffer(), (await nivelar(0.5)).png, (await nivelar(1)).png];
    const tiles = await Promise.all(vs.map(async (b, i) => ({input: await sharp(b).resize(780, 440, {fit: 'contain', position: 'bottom', background: '#ffffff'}).png().toBuffer(), left: i * 800 + 10, top: 10})));
    const f = path.join(WORK, `variantes-${nome.replace('.webp', '')}.png`);
    await sharp({create: {width: 2400, height: 460, channels: 4, background: '#ffffff'}}).composite(tiles).png().toFile(f);
    console.log(`◇ ${car.marca} ${car.modelo}: rodas (${xa},${ya}) e (${xb},${yb}) → tools/.work/${path.basename(f)}`);
    continue;
  }
  const {k, png: final} = await nivelar(nivel);
  const meta = await sharp(final).metadata();
  const out = path.join(ROOT, 'cars', nome);
  const res = await webp(sharp(final).resize({width: Math.min(MAX_W, meta.width), kernel: 'lanczos3'})).toFile(out);
  feitos.push(out);
  console.log(`✔ ${car.marca} ${car.modelo} → cars/${nome}  ${res.width}×${res.height}  ${Math.round(res.size / 1024)} KB${k ? `  inclinação ${(Math.atan(k) * 180 / Math.PI).toFixed(1)}°` : ''}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
if (feitos.length) await folha(feitos, path.join(WORK, 'folha.png'));
