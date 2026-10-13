// Recorte automático dos carros do showroom.
//
//   npm run recortar -- 1722938 1717736      (ids de cars.js)
//   npm run recortar -- --todos              (todos os carros com "showroom")
//   npm run recortar -- 1726224 --foto 1     (usar a 2.ª foto do anúncio)
//   npm run recortar -- 1722938 --nivel 0.3  (quanto nivelar: 0 = nada, 0.5 = padrão, 1 = rodas na mesma linha)
//   npm run recortar -- 1722938 --variantes  (folha para comparar: rodas detetadas | 50 % | 100 %)
//
// Passos: foto original 2100 px (variante -0 do CDN) → máscara BiRefNet → limpeza (só o carro)
// → nivelar as rodas (inclinação vertical, mantém as verticais direitas) → recorte rente → WebP.
// Gera também .work/folha.png com todos os recortes, para rever de uma vez.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import sharp from 'sharp';
import ort from 'onnxruntime-node';

const ROOT = path.resolve(import.meta.dirname, '..');
const WORK = path.join(import.meta.dirname, '.work');
const MODEL = path.join(import.meta.dirname, '.models', 'birefnet.onnx');
const SIZE = 1024;              // resolução de entrada do BiRefNet
const MAX_W = 1800;             // largura máxima do WebP final
fs.mkdirSync(WORK, {recursive: true});

// ---------- argumentos ----------
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : def; };
const fotoIdx = +opt('--foto', 0);
const nivel = +opt('--nivel', 0.5);           // 0.5 = meio caminho: mais plano sem deformar (1 = rodas na mesma linha, deforma)
const todos = args.includes('--todos');
const variantes = args.includes('--variantes');   // só compara (rodas | 50 % | 100 %), não grava em cars/
const ids = args.filter(a => !a.startsWith('--'));

// ---------- dados ----------
const ctx = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'cars.js'), 'utf8'), ctx);
const stock = ctx.window.DP_CARS;
const alvo = todos ? stock.filter(c => c.showroom && c.imagem && !(c.frames && c.frames.length)) : ids.map(id => stock.find(c => c.id === id) || die(`id ${id} não existe em cars.js`));
if (!alvo.length) die('Indique ids de cars.js ou --todos');
function die(m){ console.error('✖ ' + m); process.exit(1); }

// ---------- 1. foto original ----------
async function foto(car){
  const url = car.fotos[fotoIdx].replace(/-6\.(webp|jpe?g)$/, '-0.$1');
  const file = path.join(WORK, `${car.id}-${fotoIdx}.${url.split('.').pop()}`);
  if (!fs.existsSync(file)) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`foto ${r.status}: ${url}`);
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  return file;
}

// ---------- 2. máscara BiRefNet ----------
let session;
async function mascara(file, w, h){
  session ??= await ort.InferenceSession.create(MODEL, {graphOptimizationLevel: 'all'});
  const {data} = await sharp(file).removeAlpha().resize(SIZE, SIZE, {fit: 'fill', kernel: 'lanczos3'}).raw().toBuffer({resolveWithObject: true});
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225], N = SIZE * SIZE;
  const t = new Float32Array(3 * N);
  for (let i = 0; i < N; i++) for (let c = 0; c < 3; c++) t[c * N + i] = (data[i * 3 + c] / 255 - mean[c]) / std[c];
  const out = await session.run({[session.inputNames[0]]: new ort.Tensor('float32', t, [1, 3, SIZE, SIZE])});
  const logits = out[session.outputNames[0]].data;
  const m = Buffer.alloc(N);
  for (let i = 0; i < N; i++) m[i] = Math.round(255 / (1 + Math.exp(-logits[i])));
  return sharp(m, {raw: {width: SIZE, height: SIZE, channels: 1}}).resize(w, h, {fit: 'fill', kernel: 'lanczos3'}).toColourspace('b-w').extractChannel(0).raw().toBuffer();
}

// ---------- 3. limpeza: fica só o carro ----------
function morph(src, w, h, r, grow){
  const tmp = new Uint8Array(src.length), out = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) { let run = 0;
    for (let x = 0; x < w; x++) { let v = grow ? 0 : 1;
      for (let k = -r; k <= r; k++) { const xx = x + k, s = xx < 0 || xx >= w ? 0 : src[y * w + xx]; if (grow ? s : !s) { v = grow ? 1 : 0; break; } }
      tmp[y * w + x] = v; } }
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) { let v = grow ? 0 : 1;
    for (let k = -r; k <= r; k++) { const yy = y + k, s = yy < 0 || yy >= h ? 0 : tmp[yy * w + x]; if (grow ? s : !s) { v = grow ? 1 : 0; break; } }
    out[y * w + x] = v; }
  return out;
}
function limpar(alpha, w, h){
  const N = w * h, r = Math.max(3, Math.round(w / 400));
  for (let i = 0; i < N; i++) if (alpha[i] < 20) alpha[i] = 0;
  const forte = new Uint8Array(N); for (let i = 0; i < N; i++) forte[i] = alpha[i] > 127 ? 1 : 0;
  const er = morph(forte, w, h, r, false);
  const lab = new Int32Array(N).fill(-1), sizes = [], st = [];
  for (let p = 0; p < N; p++) {
    if (lab[p] !== -1 || !er[p]) continue;
    const id = sizes.length; let n = 0; lab[p] = id; st.push(p);
    while (st.length) { const q = st.pop(); n++; const x = q % w;
      for (const t of [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, q - w, q + w])
        if (t >= 0 && t < N && lab[t] === -1 && er[t]) { lab[t] = id; st.push(t); } }
    sizes.push(n);
  }
  const keep = sizes.indexOf(Math.max(...sizes));
  const core = new Uint8Array(N); for (let p = 0; p < N; p++) core[p] = lab[p] === keep ? 1 : 0;
  const zona = morph(core, w, h, r + 2, true);
  for (let p = 0; p < N; p++) if (!zona[p]) alpha[p] = 0;
  return alpha;
}

// ---------- 4. nivelar: os pontos de contacto das rodas à mesma altura ----------
// Perfil de baixo do carro (linha mais baixa opaca em cada coluna). Nas fotos 3/4 frente:
//   roda traseira = ponto mais baixo na ponta do lado da traseira;
//   embaladeira   = ponto mais alto do perfil entre as rodas;
//   roda da frente = ponto mais baixo logo antes da embaladeira.
// Funciona com o carro virado para qualquer lado (deteta pela posição da roda traseira).
function contactos(alpha, w, h){
  const raw = new Int32Array(w).fill(-1);
  for (let x = 0; x < w; x++) for (let y = h - 1; y >= 0; y--) if (alpha[y * w + x] > 160) { raw[x] = y; break; }
  const xs = []; for (let x = 0; x < w; x++) if (raw[x] >= 0) xs.push(x);
  const x0 = xs[0], x1 = xs.at(-1), L = x1 - x0;
  const fundo = new Float32Array(w);                    // perfil suavizado (média de ±L/200)
  const r = Math.max(2, Math.round(L / 200));
  for (let x = x0; x <= x1; x++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const v = raw[x + k]; if (v >= 0) { s += v; n++; } } fundo[x] = n ? s / n : -1; }
  const arg = (a, b, best) => { let bx = -1; for (let x = Math.round(Math.max(x0, a)); x <= Math.min(x1, b); x++) if (bx < 0 || best(fundo[x], fundo[bx])) bx = x; return bx; };
  const lowest = (a, b) => arg(a, b, (v, cur) => v > cur), highest = (a, b) => arg(a, b, (v, cur) => v < cur);
  const lado = (dir) => {                                // dir = +1: traseira à direita
    const R = dir > 0 ? lowest(x1 - .14 * L, x1) : lowest(x0, x0 + .14 * L);
    const S = dir > 0 ? highest(R - .5 * L, R - .06 * L) : highest(R + .06 * L, R + .5 * L);
    const F = dir > 0 ? lowest(S - .3 * L, S) : lowest(S, S + .3 * L);
    return {R, S, F, salto: fundo[F] - fundo[S]};        // quanto desce do embaladeira à roda da frente
  };
  const d = lado(1), e = lado(-1), c = d.salto >= e.salto ? d : e;
  const pts = [[c.F, Math.round(fundo[c.F])], [c.R, Math.round(fundo[c.R])]].sort((a, b) => a[0] - b[0]);
  return pts;                                            // [ponto à esquerda, ponto à direita]
}

// ---------- pipeline ----------
const feitos = [];
for (const car of alvo) {
  const t0 = Date.now();
  const nome = path.basename(car.imagem);
  const src = await foto(car);
  const {width: w, height: h} = await sharp(src).metadata();
  const cacheMask = src.replace(/\.\w+$/, '-mask.png');  // a máscara demora ~30 s: fica guardada
  let alpha;
  if (fs.existsSync(cacheMask)) alpha = await sharp(cacheMask).extractChannel(0).raw().toBuffer();
  else { alpha = limpar(await mascara(src, w, h), w, h); await sharp(alpha, {raw: {width: w, height: h, channels: 1}}).png().toFile(cacheMask); }
  const rgb = await sharp(src).removeAlpha().raw().toBuffer();
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { rgba[i * 4] = rgb[i * 3]; rgba[i * 4 + 1] = rgb[i * 3 + 1]; rgba[i * 4 + 2] = rgb[i * 3 + 2]; rgba[i * 4 + 3] = alpha[i]; }

  const [[xa, ya], [xb, yb]] = contactos(alpha, w, h);
  const base = sharp(rgba, {raw: {width: w, height: h, channels: 4}});
  const nivelar = async t => {                          // inclinação vertical: y' = y + k·x (as verticais ficam direitas)
    const k = t * (ya - yb) / (xb - xa);
    const img = Math.abs(k) > 0.002 ? sharp(await base.clone().affine([1, 0, k, 1], {background: {r: 0, g: 0, b: 0, alpha: 0}, interpolator: 'bicubic'}).png().toBuffer()) : base.clone();
    return {k, png: await img.trim({background: {r: 0, g: 0, b: 0, alpha: 0}, threshold: 1}).png().toBuffer()};
  };
  if (variantes) {                                      // folha: [rodas detetadas | 50 % | 100 %]
    const R = Math.round(w / 60), S = Math.round(w / 300);
    const marca = `<svg width="${w}" height="${h}"><g fill="none" stroke="#ff3b3b" stroke-width="${S}"><circle cx="${xa}" cy="${ya}" r="${R}"/><circle cx="${xb}" cy="${yb}" r="${R}"/><line x1="${xa}" y1="${ya}" x2="${xb}" y2="${yb}"/></g></svg>`;
    const pontos = await base.clone().composite([{input: Buffer.from(marca)}]).png().toBuffer();
    const vs = [pontos, (await nivelar(0.5)).png, (await nivelar(1)).png];
    const tiles = await Promise.all(vs.map(async (b, i) => ({input: await sharp(b).resize(780, 440, {fit: 'contain', position: 'bottom', background: '#0f1312'}).png().toBuffer(), left: i * 800 + 10, top: 10})));
    const f = path.join(WORK, `variantes-${nome.replace('.webp', '')}.png`);
    await sharp({create: {width: 2400, height: 460, channels: 4, background: '#0f1312'}}).composite(tiles).png().toFile(f);
    console.log(`◇ ${car.marca} ${car.modelo}: rodas (${xa},${ya}) e (${xb},${yb}) → tools/.work/${path.basename(f)}`);
    continue;
  }
  const {k, png: final} = await nivelar(nivel);
  const meta = await sharp(final).metadata();
  const out = path.join(ROOT, 'cars', nome);
  const res = await sharp(final).resize({width: Math.min(MAX_W, meta.width), kernel: 'lanczos3'})
    .webp({quality: 90, alphaQuality: 100, smartSubsample: true, effort: 6}).toFile(out);
  feitos.push(out);
  console.log(`✔ ${car.marca} ${car.modelo} → cars/${nome}  ${res.width}×${res.height}  ${Math.round(res.size / 1024)} KB  inclinação ${(Math.atan(k) * 180 / Math.PI).toFixed(1)}°  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}

// ---------- folha de revisão ----------
if (!feitos.length) process.exit(0);
const W = 600, H = 340, cols = 3, rows = Math.ceil(feitos.length / cols);
const tiles = await Promise.all(feitos.map(async (f, i) => ({
  input: await sharp(f).resize(W - 40, H - 50, {fit: 'contain', position: 'bottom', background: {r: 0, g: 0, b: 0, alpha: 0}}).png().toBuffer(),
  left: (i % cols) * W + 20, top: Math.floor(i / cols) * H + 15 })));
const linhas = feitos.map((f, i) => { const x = (i % cols) * W, y = Math.floor(i / cols) * H;
  return `<line x1="${x + 20}" x2="${x + W - 20}" y1="${y + H - 35}" y2="${y + H - 35}" stroke="#81C995" stroke-opacity=".5"/><text x="${x + 20}" y="${y + H - 12}" font-size="15" font-family="sans-serif" fill="#cfe9d8">${path.basename(f)}</text>`; }).join('');
tiles.push({input: Buffer.from(`<svg width="${W * cols}" height="${H * rows}">${linhas}</svg>`), left: 0, top: 0});
await sharp({create: {width: W * cols, height: H * rows, channels: 4, background: '#0f1312'}}).composite(tiles).png().toFile(path.join(WORK, 'folha.png'));
console.log('Folha de revisão: tools/.work/folha.png');
