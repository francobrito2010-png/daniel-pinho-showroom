// Peças comuns às ferramentas: dados, foto original, máscara BiRefNet, limpeza e folha de revisão.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import sharp from 'sharp';
import ort from 'onnxruntime-node';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const WORK = path.join(import.meta.dirname, '.work');
export const CDN = 'https://cdn.easysite.pt/pub/15144/';
const MODEL = path.join(import.meta.dirname, '.models', 'birefnet.onnx');
const SIZE = 1024;              // resolução de entrada do BiRefNet
fs.mkdirSync(WORK, {recursive: true});

export function die(m){ console.error('✖ ' + m); process.exit(1); }

// ---------- dados (cars.js) ----------
const CARS = path.join(ROOT, 'cars.js');
export function lerStock(){
  const ctx = {window: {}};
  vm.runInNewContext(fs.readFileSync(CARS, 'utf8'), ctx);
  return ctx.window.DP_CARS;
}
// Regrava cars.js mantendo o cabeçalho e uma viatura por linha.
export function gravarStock(stock){
  const src = fs.readFileSync(CARS, 'utf8');
  const head = src.slice(0, src.indexOf('window.DP_CARS'));
  fs.writeFileSync(CARS, head + 'window.DP_CARS = [\n' + stock.map(c => '  ' + JSON.stringify(c)).join(',\n') + '\n];\n');
}

// ---------- 1. foto original (variante -0, 2100 px), guardada em .work ----------
export async function baixar(url, nome){
  const file = path.join(WORK, nome + '.' + url.split('.').pop());
  if (!fs.existsSync(file)) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`foto ${r.status}: ${url}`);
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  return file;
}
export const original = url => url.replace(/-6\.(webp|jpe?g)$/, '-0.$1');

// ---------- 2. máscara BiRefNet ----------
let session;
async function mascara(file, w, h){
  if (!fs.existsSync(MODEL)) die('Falta o modelo: ver README (tools/.models/birefnet.onnx)');
  if (fs.statSync(MODEL).size !== 972666916) die('O modelo está incompleto (download interrompido?): voltar a descarregá-lo, ver README');
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
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = grow ? 0 : 1;
    for (let k = -r; k <= r; k++) { const xx = x + k, s = xx < 0 || xx >= w ? 0 : src[y * w + xx]; if (grow ? s : !s) { v = grow ? 1 : 0; break; } }
    tmp[y * w + x] = v; }
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

// ---------- foto → carro recortado (RGBA em bruto). A máscara fica em cache (~30 s cada) ----------
export async function recortar(src){
  const {width: w, height: h} = await sharp(src).metadata();
  const cache = src.replace(/\.\w+$/, '-mask.png');
  let alpha;
  if (fs.existsSync(cache)) alpha = await sharp(cache).extractChannel(0).raw().toBuffer();
  else { alpha = limpar(await mascara(src, w, h), w, h); await sharp(alpha, {raw: {width: w, height: h, channels: 1}}).png().toFile(cache); }
  const rgb = await sharp(src).removeAlpha().raw().toBuffer();
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { rgba[i * 4] = rgb[i * 3]; rgba[i * 4 + 1] = rgb[i * 3 + 1]; rgba[i * 4 + 2] = rgb[i * 3 + 2]; rgba[i * 4 + 3] = alpha[i]; }
  return {rgba, alpha, w, h};
}

export const TRANSP = {r: 0, g: 0, b: 0, alpha: 0};
// Pesos (prompt §9.7): imagem principal 1600 px q88, ângulos da rotação 1400 px q84 — objetivo < 200 KB
export const PRINCIPAL = {largura: 1600, q: 88}, ANGULO = {largura: 1400, q: 84};
export const webp = (img, q = 88) => img.webp({quality: q, alphaQuality: 90, smartSubsample: true, effort: 6});
// Grava em WebP; se passar de 200 KB baixa a qualidade de 4 em 4 (no mínimo 78).
export async function gravar(img, file, q){
  const buf = await img.png().toBuffer();
  for (let qq = q; ; qq -= 4) {
    const out = await webp(sharp(buf), qq).toBuffer();
    if (out.length <= 200 * 1024 || qq - 4 < 78) { fs.writeFileSync(file, out); return {size: out.length, q: qq}; }
  }
}

// ---------- folha de revisão (fundo branco, como o tema principal) ----------
export async function folha(files, out, cols = 3){
  const W = 600, H = 340, rows = Math.ceil(files.length / cols);
  const tiles = await Promise.all(files.map(async (f, i) => ({
    input: await sharp(f).resize(W - 40, H - 50, {fit: 'contain', position: 'bottom', background: TRANSP}).png().toBuffer(),
    left: (i % cols) * W + 20, top: Math.floor(i / cols) * H + 15 })));
  const linhas = files.map((f, i) => { const x = (i % cols) * W, y = Math.floor(i / cols) * H;
    return `<line x1="${x + 20}" x2="${x + W - 20}" y1="${y + H - 35}" y2="${y + H - 35}" stroke="#19644D" stroke-opacity=".5"/><text x="${x + 20}" y="${y + H - 12}" font-size="15" font-family="sans-serif" fill="#19644D">${path.relative(path.join(ROOT, 'cars'), f).replace(/\\/g, '/')}</text>`; }).join('');
  tiles.push({input: Buffer.from(`<svg width="${W * cols}" height="${H * rows}">${linhas}</svg>`), left: 0, top: 0});
  await sharp({create: {width: W * cols, height: H * rows, channels: 4, background: '#ffffff'}}).composite(tiles).png().toFile(out);
  console.log('Folha de revisão: tools/.work/' + path.basename(out));
}
