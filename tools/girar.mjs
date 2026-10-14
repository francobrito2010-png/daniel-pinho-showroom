// Rotação do showroom a partir das fotos do anúncio.
//
//   npm run girar                 (todos os carros de "_giro" em galerias.json)
//   npm run girar -- 1722938      (só um carro)
//
// As fotos do stand têm 3 ângulos exteriores (3/4 esquerda, frente, 3/4 direita). Para cada carro:
// recorta cada ângulo, põe todos à mesma altura (o carro não "cresce" ao rodar), centra-os numa tela
// comum assente nas rodas e grava cars/<nome>/<n>.webp. Em cars.js, "frames" fica em vaivém
// (0 → 1 → 2 → 1) para a rotação não dar saltos, e "imagem" passa a ser o 1.º ângulo.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {ROOT, WORK, CDN, TRANSP, die, lerStock, gravarStock, baixar, recortar, webp, folha} from './lib.mjs';

const MAX_W = 1800;
const gal = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'galerias.json'), 'utf8'));
const ids = process.argv.slice(2).filter(a => !a.startsWith('--'));
const alvo = ids.length ? ids : Object.keys(gal._giro);
const stock = lerStock();
const feitos = [];

for (const id of alvo) {
  const car = stock.find(c => c.id === id) || die(`id ${id} não existe em cars.js`);
  const angulos = gal._giro[id] || die(`id ${id} sem "_giro" em galerias.json`);
  const slug = path.basename(car.imagem, '.webp');
  const t0 = Date.now();

  // 1. recorta cada ângulo (a foto 0 reutiliza a cache de recortar.mjs)
  const cortes = [];
  for (const n of angulos) {
    const url = CDN + id + '/' + gal[id][n] + '-0.webp';
    const {rgba, w, h} = await recortar(await baixar(url, `${id}-${n}`));
    const png = await sharp(rgba, {raw: {width: w, height: h, channels: 4}}).trim({background: TRANSP, threshold: 1}).png().toBuffer();
    const m = await sharp(png).metadata();
    cortes.push({png, w: m.width, h: m.height});
  }

  // 2. mesma altura para todos (a do 1.º ângulo) e tela comum, centrada e assente em baixo
  const H = cortes[0].h;
  const iguais = await Promise.all(cortes.map(async c => {
    const w = Math.round(c.w * H / c.h);
    return {png: await sharp(c.png).resize(w, H, {kernel: 'lanczos3'}).png().toBuffer(), w};
  }));
  const W = Math.max(...iguais.map(c => c.w));
  const escala = Math.min(1, MAX_W / W);

  // 3. grava cars/<slug>/<n>.webp (apaga a rotação antiga)
  const dir = path.join(ROOT, 'cars', slug);
  fs.rmSync(dir, {recursive: true, force: true});
  fs.mkdirSync(dir, {recursive: true});
  const files = [];
  for (const [k, c] of iguais.entries()) {
    const tela = sharp({create: {width: W, height: H, channels: 4, background: TRANSP}})
      .composite([{input: c.png, left: Math.round((W - c.w) / 2), top: 0}]).png();
    const buf = await sharp(await tela.toBuffer()).resize(Math.round(W * escala), Math.round(H * escala), {kernel: 'lanczos3'}).png().toBuffer();
    const f = path.join(dir, `${k}.webp`);
    await webp(sharp(buf)).toFile(f);
    files.push(f);
    if (k === 0) await webp(sharp(buf)).toFile(path.join(ROOT, 'cars', slug + '.webp'));
  }
  feitos.push(...files);

  // 4. cars.js: vaivém 0 → 1 → 2 → 1
  const seq = [...files.keys(), ...[...files.keys()].slice(1, -1).reverse()];
  car.frames = seq.map(k => `cars/${slug}/${k}.webp`);
  console.log(`✔ ${car.marca} ${car.modelo}: ${files.length} ângulos → cars/${slug}/  ${Math.round(W * escala)}×${Math.round(H * escala)}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
gravarStock(stock);
console.log('cars.js atualizado');
await folha(feitos, path.join(WORK, 'folha-giro.png'), 3);
